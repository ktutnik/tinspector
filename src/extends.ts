import { ClassReflection, MethodReflection, ParameterReflection, PropertyReflection } from "./types"

type MemberReflection = PropertyReflection | MethodReflection | ParameterReflection

// --------------------------------------------------------------------- //
// ------------------------------ EXTENDER ----------------------------- //
// --------------------------------------------------------------------- //


function mergeMembers(children: MemberReflection[], parents: MemberReflection[]): MemberReflection[] {
    const result: MemberReflection[] = [...children]
    for (const parent of parents) {
        const exists = result.find(x => x.name === parent.name)
        if (exists) continue
        result.push(parent)
    }
    return result
}

function extendsMetadata(child: ClassReflection, parent: ClassReflection): ClassReflection {
    return {
        ...child,
        methods: mergeMembers(child.methods, parent.methods) as MethodReflection[],
        properties: mergeMembers(child.properties, parent.properties) as PropertyReflection[]
    }
}

export { extendsMetadata }