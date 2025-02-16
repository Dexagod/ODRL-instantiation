import { describe, it, expect } from '@jest/globals';
import { toMatchRdfSnapshot } from 'rdf-jest';

// Register the custom matcher
expect.extend({ toMatchRdfSnapshot });

describe('PACSOI Tests', () => {
    it('Should convert the demonstrator policy and request into demonstrator agreement', () => {
        

        const policyText = 
`PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

PREFIX ex: <http://example.org/>

<http://example.org/alice-HCPX> a odrl:Set ;
    odrl:uid ex:alice-HCPX ;
    dcterms:description "Alice allows her health data to be read by HCP X for bariatric care.";
    odrl:permission <http://example.org/alice-HCPX-permission> .

<http://example.org/alice-HCPX-permission> a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target ex:health-data ;
    odrl:assigner ex:alice ;
    odrl:assignee ex:HCPx ;
    odrl:constraint <http://example.org/alice-HCPX-permission-purpose> .

<http://example.org/alice-HCPX-permission-purpose> a odrl:Constraint ;
    odrl:leftOperand odrl:purpose ;
    odrl:operator odrl:eq ;
    odrl:rightOperand ex:bariatric-care .`
        
        const requestText = 
`PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX eu-gdpr: <https://w3id.org/dpv/legal/eu/gdpr#>
PREFIX oac: <https://w3id.org/oac#>
PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

PREFIX ex: <http://example.org/>

<http://example.org/HCPX-request> a odrl:Request ;
    odrl:uid ex:HCPX-request ;
    odrl:profile oac: ;
    dcterms:description "HCP X requests to read Alice's health data for bariatric care.";
    odrl:permission <http://example.org/HCPX-request-permission> .

<http://example.org/HCPX-request-permission> a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target ex:health-data ;
    odrl:assigner ex:alice ;
    odrl:assignee ex:HCPx ;
    odrl:constraint <http://example.org/HCPX-request-permission-purpose>,
        <http://example.org/HCPX-request-permission-lb> .

<http://example.org/HCPX-request-permission-purpose> a odrl:Constraint ;
    odrl:leftOperand odrl:purpose ; # can also be oac:Purpose, to conform with OAC profile
    odrl:operator odrl:eq ;
    odrl:rightOperand ex:bariatric-care .

<http://example.org/HCPX-request-permission-lb> a odrl:Constraint ;
    odrl:leftOperand oac:LegalBasis ;
    odrl:operator odrl:eq ;
    odrl:rightOperand eu-gdpr:A9-2-a .
`

const agreementText =
`PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX dpv: <https://w3id.org/dpv#>
PREFIX eu-gdpr: <https://w3id.org/dpv/legal/eu/gdpr#>
PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

PREFIX ex: <http://example.org/>

<http://example.org/Alice-HCPX-agreement> a odrl:Agreement ;
    odrl:uid ex:Alice-HCPX-agreement ;
    dcterms:references <http://example.org/alice-HCPX>, <http://example.org/HCPX-request> ;
    dcterms:description "Agreement for HCP X to read Alice's health data for bariatric care." ;
    dpv:hasLegalBasis eu-gdpr:A9-2-a ;
    odrl:permission <http://example.org/agreement-permission> .

<http://example.org/agreement-permission> a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target ex:health-data ;
    odrl:assigner ex:alice ;
    odrl:assignee ex:HCPx ;
    odrl:constraint <http://example.org/agreement-permission-purpose> .

<http://example.org/agreement-permission-purpose> a odrl:Constraint ;
    odrl:leftOperand odrl:purpose ; 
    odrl:operator odrl:eq ;
    odrl:rightOperand ex:bariatric-care .
`

    });
});