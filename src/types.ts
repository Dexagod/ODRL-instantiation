// todo: implement RDF lists

export type JSONLDIdentifier = { "@id": string }

export type JSONLDLiteral = { "@value": string, "@type"?: StringOrJSONLDIdentifier }

export type StringOrJSONLDIdentifier = string | JSONLDIdentifier

export type StringOrJSONLDIdentifierPotentialArray = string | JSONLDIdentifier | string[] | JSONLDIdentifier[]

export type ODRLPolicy = {
    uid?: string,
    type?: string,
    profile?: string,
    permission?: ODRLRule | ODRLRule[],
    prohibition?: ODRLRule | ODRLRule[],
    obligation?: ODRLRule | ODRLRule[],
}

export type ODRLRule = {
    uid?: string,
    type?: string,
    action: StringOrJSONLDIdentifierPotentialArray,
    target: StringOrJSONLDIdentifierPotentialArray,
    assigner: string,
    assignee: string,
    constraint: ODRLConstraint // todo: extend to allow multiple constraints with lists
}

export type ODRLActionRestriction = {
    "rdf:value": StringOrJSONLDIdentifier,
    "refinement"?: ODRLConstraint
}

export type ODRLConstraint = {
    uid?: string,
    type?: string,
    leftOperand: StringOrJSONLDIdentifier,
    operator: StringOrJSONLDIdentifier,
    rightOperand: StringOrJSONLDIdentifier | JSONLDLiteral
}