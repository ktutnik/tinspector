import {
    ClassReflection,
    DecoratorId,
    DecoratorOption,
    MethodReflection,
    ParameterReflection,
    PropertyReflection,
} from "./types"

// --------------------------------------------------------------------- //
// --------------------- EXTEND METADATA FUNCTIONS --------------------- //
// --------------------------------------------------------------------- //


function extendDecorators(child: any[], parent: any[]) {
    const result = [...child]
    for (const decorator of parent) {
        const options: DecoratorOption = decorator[DecoratorOption]!
        // continue, if the decorator is not inheritable
        if (!options.inherit) continue
        // continue, if allow multiple and already has decorator with the same ID
        if (!options.allowMultiple && child.some(x => x[DecoratorId] === decorator[DecoratorId])) continue
        result.push(decorator)
    }
    return result
}

function extendParameter(child: ParameterReflection[], parent: ParameterReflection[]) {
    const result: ParameterReflection[] = []
    for (const member of child) {
        const exists = parent.find(x => x.name === member.name)!
        member.decorators = extendDecorators(member.decorators, exists.decorators)
        result.push(member)
    }
    return result
}

function extendProperty(child: PropertyReflection[], parent: PropertyReflection[]) {
    const result = [...child]
    for (const member of parent) {
        const exists = result.find(x => x.name === member.name)
        if (exists) {
            exists.decorators = extendDecorators(exists.decorators, member.decorators)
            continue
        }
        member.decorators = extendDecorators([], member.decorators)
        result.push(member)
    }
    return result
}

function extendMethod(child: MethodReflection[], parent: MethodReflection[]) {
    const result = [...child]
    for (const member of parent) {
        const exists = result.find(x => x.name === member.name)
        if (exists) {
            exists.parameters = extendParameter(exists.parameters, member.parameters)
            exists.decorators = extendDecorators(exists.decorators, member.decorators)
            continue
        }
        member.decorators = extendDecorators([], member.decorators)
        result.push(member)
    }
    return result
}

function extendClass(child: ClassReflection, parent: ClassReflection): ClassReflection {
    const { ctor, methods, properties, decorators, ...result } = child;
    return {
        ...result,
        ctor,
        decorators: extendDecorators(child.decorators, parent.decorators),
        methods: extendMethod(child.methods, parent.methods),
        properties: extendProperty(child.properties, parent.properties)
    }
}

export {extendClass}