import { BlankNode, Literal, NamedNode, Quad } from 'rdf-js';
import { OdrlPolicyExtractor, ActiveConflictResolver, PriorityConflictResolver, DenyConflictResolver, ConflictEvaluator, RDF, } from "../conflict_resolution/policy-conflict-resolver/src"
import { WrappedEvaluatorHandler } from "../conflict_resolution/policy-conflict-resolver/src/WrappedEvaluatorHandler"
import { ODRLEngineMultipleSteps, ODRLEvaluator} from  "odrl-evaluator"
import { frame } from "jsonld"
import { DataFactory } from 'rdf-js';
import { DataFactory as N3DF, Store, Writer, Parser } from 'n3';
import { rdfSerializer } from "rdf-serialize";
import { ODRLPolicy } from './types'
import { v4 as uuidv4 } from 'uuid';

const stringifyStream = require("stream-to-string")
const streamifyArray = require("streamify-array")

const { quad, namedNode, blankNode, literal } = N3DF

export async function convertODRLPoliciesToInstantiatedPolicy(instantiationRequest: Quad[], instantiationPolicies: Quad[][], instantiationSotw: Quad[]): Promise<Quad[]> {

    const requestStore = new Store(instantiationRequest)
    // The policy instantiation algorithm distills an agreement from a set of provided policies, 
    // an ODRL request and a state of the world that provides sufficient information to validate
    // the policy requirements. From these policies, an Agreement is created that stipulates the
    // exact terms of the agreement and the usage requirements to which must be adhered by both 
    // parties.


    // The algorithm is as follows: 
    
    // *****************************
    // 1. For each policy, verify it is an odrl:Policy (= Set) or an odrl:Set, 
    //    NOT an odrl:Agreement or an odrl:Offer
    //    Currently this tooling is restricted to exact URL matches
    // *****************************

    const policyFrame = {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": [ "Policy", "Set" ]
    }

    // let policies: ODRLPolicy[] = []
    for (let policyQuads of instantiationPolicies) {
        const policyStore = new Store(policyQuads)
        const policyType = policyStore.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Policy"), null)
        const setType = policyStore.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Policy"), null)
        if (policyType.length !== 1 && setType.length !== 0) {
            throw new Error("Passed policies must be either of type odrl:Policy or odrl:Set")
        }
    }

      // // Convert quads to a JSON object in JSON-LD format
      // const quadStream = streamifyArray(policyQuads.slice(0)); // slice to make copy of array, else stream consumes array
      // const textStream = rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' });
      // const jsonLdString = await stringifyStream(textStream)

      // // frame the policy
      // const doc = JSON.parse(jsonLdString)
      // const policy : ODRLPolicy = ( await frame(doc, policyFrame)) as ODRLPolicy;

      // // todo: some verification step here to check policy integrity

      // console.log(policy)

      // if (!policy.type || ( policy.type !== "Set" && policy.type !== "Policy" ) ) {
      //   throw new Error("Policy must be a either odrl:Set or odrl:Policy as this defaults to a policy set.")
      // }
      // policies.push(policy)
    // }

    // *****************************
    // 2. Convert each policy into its atomic rules according to https://www.w3.org/TR/odrl-model/#composition 
    // *****************************

    // todo: implement atomization algorithm

    // function atomizePolicy(policy: ODRLPolicy): ODRLPolicy[] {

    // }

    // const atomizedPolicies: ODRLPolicy[] = []

    // for (let policy of policies) {
    //   atomizedPolicies.concat( atomizePolicy(policy) )
    // }

    // policies = atomizedPolicies;


    // *****************************
    // 3. Remove all rules that do not target the request URL, and remove empty policies
    // *****************************

    // todo:: implement

    // *****************************
    // 4. For each policy, verify that all policy requirements are fulfilled (odrl-evaluator pass) (https://github.com/joachimvh/policy-conflict-resolver)
    //    Remove all rules from the policies for which the conditions were not fully satisfied
    // *****************************

    const extractor = new OdrlPolicyExtractor();
    const source = new WrappedEvaluatorHandler(new ODRLEvaluator(new ODRLEngineMultipleSteps()));
    const resolver = new ActiveConflictResolver(new PriorityConflictResolver(new DenyConflictResolver()));

    const evaluator = new ConflictEvaluator(extractor, source, resolver);

    // todo: convert back to parser 
    const evaluationResult = await evaluator.evaluate(instantiationPolicies[0], instantiationRequest, instantiationSotw)
    console.log('instantiationPolicies', instantiationPolicies)
    const reportStore = new Store(evaluationResult)

    // Extract report
    const conflictReport = reportStore.getQuads(null, RDF.terms.type, namedNode("http://example.com/report/temp/ConflictReport"), null)
    if (conflictReport.length === 0) { throw new Error("Conflict report not found") }
    if (conflictReport.length > 1) { throw new Error("Multiple conflict reports found") }
  
    // Extract conclusion
    const conclusion = reportStore.getQuads(conflictReport[0].subject, namedNode("http://example.com/report/temp/conclusion"), null, null)
    if (conclusion.length === 0) { throw new Error("Report conclusion not found") }
    if (conclusion.length > 1) { throw new Error("Multiple report conclusions found") }
    
    // *****************************
    // 5. If all requirements are satisfied, we can start the instantiation of the resulting policies and rules, if not return an error
    // *****************************

    if (conclusion[0].object.value !== "http://example.com/report/temp/Allow") {
        // todo: implement logging of explanation given in the report
        throw new Error('Policy requirements not satisfied')
    }

    // *****************************
    // 6. Create a new odrl:Agreement that is the basis of the instantiated agreement
    // *****************************

    const agreementStore = new Store();
    const agreementId = namedNode(`urn:policy:${uuidv4()}`)
    agreementStore.addQuad(quad(agreementId, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Agreement")))

    // *****************************
    // 7. Add a dcterms:references to the agreement linking the ODRL Request, as well as all the policies that are left at this step
    // *****************************

    // Adding the request
    const requestQuad = requestStore.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Request"), null)
    if (requestQuad.length !== 1) { throw new Error("Could not find odrl:Request type.") }
    agreementStore.addQuad(quad(agreementId, namedNode('http://purl.org/dc/terms/references'), requestQuad[0].subject))

    // Adding the policies
    for (let policyQuads of instantiationPolicies) {
        const store = new Store(policyQuads)
        const policyType = store.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Policy"), null)
        const setType = store.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Set"), null)
        const policyID = policyType.length === 1 ? policyType[0].subject : setType[0].subject
        
        if (policyType.length === 1 || setType.length === 1) {
            agreementStore.addQuad(quad(agreementId, namedNode('http://purl.org/dc/terms/references'), policyID))
        }   
    }
    
    // *****************************    
    // 8. For each combination of rule type and action that is left, sort per action rule type and action and merge equal entries
    // *****************************
    
    // todo: implement

    // *****************************    
    // 9. Iterate over each rule type - action combo
    // *****************************

    for (let policyQuads of instantiationPolicies) {
        const policyStore = new Store(policyQuads)
        const policyType = policyStore.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Policy"), null)
        const setType = policyStore.getQuads(null, RDF.terms.type, namedNode("http://www.w3.org/ns/odrl/2/Set"), null)
        const policyID = policyType.length === 1 ? policyType[0].subject : setType[0].subject
        

        const permissions = policyStore.getQuads(policyID, namedNode("http://www.w3.org/ns/odrl/2/permission"), null, null)
        const prohibitions = policyStore.getQuads(policyID, namedNode("http://www.w3.org/ns/odrl/2/prohibition"), null, null)
        const obligations = policyStore.getQuads(policyID, namedNode("http://www.w3.org/ns/odrl/2/obligation"), null, null)


        // todo: this is a shortcut. These different rule types have different expressions, and should be handled as such
        
        const permissionRuleIds = permissions.map(quad => quad.object )
        const prohibitionRuleIds = prohibitions.map(quad => quad.object )
        const obligationRuleIds = obligations.map(quad => quad.object )

        const rules = permissionRuleIds.map(id => {return({pred: "http://www.w3.org/ns/odrl/2/permission", id})})
            .concat(prohibitionRuleIds.map(id => {return({pred: "http://www.w3.org/ns/odrl/2/prohibition", id})}))
            .concat(obligationRuleIds.map(id => {return({pred: "http://www.w3.org/ns/odrl/2/obligation", id})}));

        for ( const {id: policyRuleId, pred} of rules ) {

            // *****************************
            // 10. Create a rule type - action entry on the agreement
            // *****************************

            const ruleAction = policyStore.getObjects(policyRuleId, "http://www.w3.org/ns/odrl/2/action", null)
            if(!ruleAction || !ruleAction.length) continue;
            const actionTerm = ruleAction[0]

            const agreementRuleId = namedNode(`urn:rule:${uuidv4()}`)
            agreementStore.addQuad(quad(agreementId, namedNode(pred), agreementRuleId))
            agreementStore.addQuad(quad(agreementRuleId, namedNode("http://www.w3.org/ns/odrl/2/action"), actionTerm))

            // *****************************
            // 11. For all constraints mapped to that rule, instantiate the target to the Request target 
            // *****************************

            // todo: for each action in the request, a separate negotiation should be done actually in hindsight
            const target = getStoreValue(requestStore, null, namedNode("http://www.w3.org/ns/odrl/2/target"), null).object
            agreementStore.addQuad(quad(agreementRuleId, namedNode("http://www.w3.org/ns/odrl/2/target"), target))

            // *****************************
            // 12. Set assigner to be the Entity the managing user (known for now, distill how later?)
            // *****************************
            
            try {
                const assigner = getStoreValue(requestStore, null, namedNode("http://www.w3.org/ns/odrl/2/assigner"), null).object
                agreementStore.addQuad(quad(agreementRuleId, namedNode("http://www.w3.org/ns/odrl/2/assigner"), assigner))
            } catch (e) {
                console.error('No assigner found in request, cannot add assigner to Agreement.')
            }
            

            // *****************************
            // 13. Set the assignee to be the assignee of the ODRL request
            // *****************************

            try {
                const assignee = getStoreValue(requestStore, null, namedNode("http://www.w3.org/ns/odrl/2/assignee"), null).object
                agreementStore.addQuad(quad(agreementRuleId, namedNode("http://www.w3.org/ns/odrl/2/assignee"), assignee))
            } catch (e) {
                console.error('No assignee found in request, cannot add assignee to Agreement.')
            }

            // *****************************
            // 14. For each constraint assigned to the rule type - action combination
            //     If the constraint has no defined subject, we expect the subject to be the RULE on which it is defined.
            //     The constraint MUST be defined on the created rule in the agreement, and can be defined as a predicate-object
            //     triple defined on that same rule in case of an odrl:eq operator or in case the operator and value can be
            //     converted in a predicate that is semantically equal (e.g. an enddate predicate instead of a lesser than - date constraint)
            // *****************************
            try {

                console.log(policyStore.getQuads(null, "http://www.w3.org/ns/odrl/2/constraint", null, null))
                console.log(policyStore.getQuads(null, null, null, null))

                const policyConstraints = getStoreValueArray(policyStore, policyRuleId as NamedNode, namedNode("http://www.w3.org/ns/odrl/2/constraint"), null)
                    .map(quad => quad.object as NamedNode)

                for (let policyConstraintId of policyConstraints) {
                    const constraintQuads = getStoreValueArray(policyStore, policyConstraintId, null, null)
                    // const constraintOperator = getStoreValue(policyStore, policyConstraintId, namedNode("http://www.w3.org/ns/odrl/2/operator"), null)
                    // const constraintRightOperand = getStoreValue(policyStore, policyConstraintId, namedNode("http://www.w3.org/ns/odrl/2/rightOperand"), null)
                    // const constraintLeftOperand = getStoreValue(policyStore, policyConstraintId, namedNode("http://www.w3.org/ns/odrl/2/leftOperand"), null)

                    const agreementConstraintId = namedNode(`urn:constraint:${uuidv4()}`)
                    agreementStore.addQuad(quad(agreementRuleId, namedNode("http://www.w3.org/ns/odrl/2/constraint"), agreementConstraintId))
                    for (const quad of constraintQuads) {
                        agreementStore.addQuad(agreementConstraintId, quad.predicate, quad.object)
                    }
                }
            } catch (e) {
                console.error('No constraints found in policy, cannot add constraints to Agreement.')
            }
        }
    }

    // *****************************
    // 15. Return the generated agreement.
    // *****************************

    const agreementFrame = {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": [ "Agreement" ]
    }

    const agreementQuads = agreementStore.getQuads(null, null, null, null)

    // Convert quads to a JSON object in JSON-LD format
    const quadStream = streamifyArray(agreementQuads.slice(0)); // slice to make copy of array, else stream consumes array
    const textStream = rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' });
    const jsonLdString = await stringifyStream(textStream)

    // frame the policy
    const doc = JSON.parse(jsonLdString)
    const agreement : ODRLPolicy = ( await frame(doc, agreementFrame) ) as ODRLPolicy;

    // todo: some verification step here to check policy integrity

    console.log("Resulting agreement")
    console.log(agreement)

    return agreementQuads

}

function getStoreValue(
    store: Store, 
    subject: null | NamedNode | BlankNode, 
    predicate: null | NamedNode, 
    object: null | NamedNode | BlankNode | Literal
): Quad {
    const quads = store.getQuads(subject, predicate, object, null)
    if (!quads || !quads.length) { throw new Error(`Store lookup not found for ${subject?.value} - ${predicate?.value} - ${object?.value}`) }
    return quads[0];
}


function getStoreValueArray(
    store: Store, 
    subject: null | NamedNode | BlankNode, 
    predicate: null | NamedNode, 
    object: null | NamedNode | BlankNode | Literal
): Quad[] {
    const quads = store.getQuads(subject, predicate, object, null)
    if (!quads || !quads.length) { throw new Error(`Store lookup not found for ${subject?.value} - ${predicate?.value} - ${object?.value}`) }
    return quads;
}