'use strict';

const common = require("oci-common");
const core = require("oci-core");

// Auth credentials
const tenancy = process.env.OCI_TENANCY;
const user = process.env.OCI_USER;
const fingerprint = process.env.OCI_FINGERPRINT;
const privateKey = process.env.OCI_PRIVATE_KEY;
const subnet = process.env.OCI_SUBNET;
const region = common.Region[process.env.OCI_REGION.toUpperCase()];

// Specific parameters for knowning to what instance the static public IP address needs to be attach to.
const publicIpv4Address = process.env.OCI_PUBLIC_IPV4_ADDRESS;
const publicIpv6Address = process.env.OCI_PUBLIC_IPV6_ADDRESS;
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

        if (publicIpv4Address) {
            // Fetch the ID of the public static IP address.
            const getPublicIpByIpAddressDetails = {
                ipAddress: publicIpv4Address
            };
            const getPublicIpByIpAddressRequest = {
                getPublicIpByIpAddressDetails: getPublicIpByIpAddressDetails
            };
            const getPublicIpByIpAddressResponse = await vNetclient.getPublicIpByIpAddress(
                getPublicIpByIpAddressRequest
            );
            const publicIpId = getPublicIpByIpAddressResponse.publicIp.id;

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
            console.log("Successfully attached the public IPv4 address " + publicIpv4Address + " to the instance name: " + instanceName);
        }

        if (publicIpv6Address) {
            // Get all IPv6 addresses filtered by publicIpv6Address
            const ipv6AddressesOfSubnet = await vNetclient.listIpv6s({
                ipAddress: publicIpv6Address,
                subnetId: subnet
            });

            // Get the ID of the first IPv6 address of the returned list.
            const ipv6AddressId = ipv6AddressesOfSubnet.items[0].id;

            const updateIpv6Details = {
                vnicId: vnicId
            };

            const updateIpv6Request = {
                ipv6Id: ipv6AddressId,
                updateIpv6Details: updateIpv6Details,
            };

            // Update IPv6 address with the previously fetched vnic id.
            await vNetclient.updateIpv6(updateIpv6Request);
            console.log("Successfully attached the public IPv6 address " + publicIpv6Address + " to the instance name: " + instanceName);
        }
    } catch (error) {
        console.log("Got an error:");
        throw (error);
    }
})();
