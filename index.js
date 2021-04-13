'use strict';

const common = require("oci-common");
const core = require("oci-core");

// Auth credentials
const tenancy = process.env.OCI_TENANCY;
const user = process.env.OCI_USER;
const fingerprint = process.env.OCI_FINGERPRINT;
const privateKey = process.env.OCI_PRIVATE_KEY;
const region = common.Region[process.env.OCI_REGION.toUpperCase()];

// Specific parameters for knowning to what instance the static public IP address needs to be attach to.
const publicStaticIpAddress = process.env.OCI_PUBLIC_STATIC_IP;
const instanceName = process.env.OCI_INSTANCE_NAME;

const provider = new common.SimpleAuthenticationDetailsProvider(
    tenancy,
    user,
    fingerprint,
    privateKey,
    undefined,
    region
);

(async () => {
    try {
        const computeClient = new core.ComputeClient({
            authenticationDetailsProvider: provider
        });
        const vNetclient = new core.VirtualNetworkClient({ authenticationDetailsProvider: provider });

        // Fetch the ID of the public static IP address.
        const getPublicIpByIpAddressDetails = {
            ipAddress: publicStaticIpAddress
        };
        const getPublicIpByIpAddressRequest = {
            getPublicIpByIpAddressDetails: getPublicIpByIpAddressDetails
        };
        const getPublicIpByIpAddressResponse = await vNetclient.getPublicIpByIpAddress(
            getPublicIpByIpAddressRequest
        );
        const publicIpId = getPublicIpByIpAddressResponse.publicIp.id;

        // Get the ID of the instance where the program is running on.
        const listInstancesRequest = {
            compartmentId: tenancy,
            displayName: instanceName,
        };
        const listInstancesResponse = await computeClient.listInstances(listInstancesRequest);
        const instanceId = listInstancesResponse.items[0].id;
        const listVnicAttachmentsRequest = {
            compartmentId: tenancy,
            instanceId: instanceId,
        };

        // Get the ID of the first vnic of the instance where the program is running on.
        const listVnicAttachmentsResponse = await computeClient.listVnicAttachments(
            listVnicAttachmentsRequest
        );
        const vnicId = listVnicAttachmentsResponse.items[0].vnicId;
        const listPrivateIpsRequest = {
            vnicId: vnicId
        };

        // Get the ID of the second private IP of the previously fetched vnic.
        const listPrivateIpsResponse = await vNetclient.listPrivateIps(listPrivateIpsRequest);
        const privateIpID = listPrivateIpsResponse.items.filter(item => item.isPrimary == false)[0].id;

        // Attach the public static IP address to the corresponding private IP ID.
        const updatePublicIpDetails = {
            privateIpId: privateIpID
        };
        const updatePublicIpRequest = {
            publicIpId: publicIpId,
            updatePublicIpDetails: updatePublicIpDetails,
        };
        await vNetclient.updatePublicIp(updatePublicIpRequest);
    } catch (error) {
        console.log("Got an error:");
        console.log(error);
    }

    if (process.env.INFINITE_WAIT) {
        process.on('SIGINT', () => {
            process.exit();
        });
        while (true);
    }
})();
