import {
    ClassReflection,
    DecoratorId,
    DecoratorOption,
    DecoratorOptionId,
    MethodReflection,
    ParameterReflection,
    PropertyReflection,
} from "./types"

type MemberReflection = PropertyReflection | MethodReflection | ParameterReflection

// --------------------------------------------------------------------- //
// ------------------------------ EXTENDER ----------------------------- //
// --------------------------------------------------------------------- //


function mergeMember(ref: ClassReflection, child: MemberReflection | undefined, parent: MemberReflection): MemberReflection {
    if (parent.kind === "Method") {
        const childParameters = (child as MethodReflection)?.parameters ?? []
        const merged = (child ?? parent) as MethodReflection
        // copy parent parameters if number of current parameters = 0, else just merge existing parameters with parent
        const copyParentParameters = childParameters.length === 0
        const parameters = mergeMembers(ref, childParameters, parent.parameters, copyParentParameters) as ParameterReflection[]
        return { ...merged, returnType: parent.returnType, typeClassification: parent.typeClassification, parameters }
    }
    else {
        const merged = (child ?? parent) as PropertyReflection | ParameterReflection
        return { ...merged, type: parent.type, typeClassification: parent.typeClassification }
    }
}

function mergeMembers(ref: ClassReflection, children: MemberReflection[], parents: MemberReflection[], copy = true): MemberReflection[] {
    const result: MemberReflection[] = []
    const isExists: { [key: string]: true } = {}
    for (const child of children) {
        const parent = parents.find(x => x.name === child.name)
        if (parent) {
            result.push(mergeMember(ref, child, parent))
            isExists[child.name] = true
        }
        else
            result.push(child)
    }
    if (copy) {
        for (const parent of parents) {
            if (isExists[parent.name]) continue
            result.push(mergeMember(ref, undefined, parent))
        }
    }
    return result
}

function extendsMetadata(child: ClassReflection, parent: ClassReflection): ClassReflection {
    return {
        ...child,
        methods: mergeMembers(child, child.methods, parent.methods) as MethodReflection[],
        properties: mergeMembers(child, child.properties, parent.properties) as PropertyReflection[]
    }
}

export { extendsMetadata }