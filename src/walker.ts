import { extendsMetadata } from "./extends"
import { metadata } from "./helpers"
import { parseClass } from "./parser"
import {
    ArrayDecorator,
    Class,
    ClassReflection,
    ConstructorReflection,
    DECORATOR_KEY,
    DecoratorOption,
    DecoratorOptionId,
    DecoratorTargetType,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    GenericTemplateDecorator,
    GenericTypeDecorator,
    MethodReflection,
    NativeDecorator,
    NativeParameterDecorator,
    NoopDecorator,
    ParameterPropertiesDecorator,
    ParameterPropertyReflection,
    ParameterReflection,
    PrivateDecorator,
    PropertyReflection,
    Reflection,
    TypeDecorator,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- TYPES ------------------------------- //
// --------------------------------------------------------------------- //

type TypedReflection = ClassReflection | MethodReflection | PropertyReflection | ParameterReflection | ConstructorReflection | ParameterPropertyReflection
type WalkVisitor = (value: TypedReflection, ctx: WalkMemberContext) => TypedReflection | undefined
type TypeOverride = string | string[] | Class | Class[]

interface WalkMemberContext {
    target: Class
    classPath: Class[]
    parent: Reflection
    visitor: WalkVisitor
}

interface WalkClassContext {
    visitor: WalkVisitor
    classPath: Class[]
}

// --------------------------------------------------------------------- //
// -------------------------- VISITOR HELPERS -------------------------- //
// --------------------------------------------------------------------- //

function getDecorators(targetClass: Class, targetType: DecoratorTargetType, target: string, index?: number) {
    const natives: NativeDecorator[] = Reflect.getOwnMetadata(DECORATOR_KEY, targetClass) || []
    const result = []
    for (const { allowMultiple, inherit, ...item } of natives) {
        const par = item as NativeParameterDecorator
        if (item.targetType === targetType && item.target === target && (index == undefined || par.targetIndex === index)) {
            result.push({ ...item.value, [DecoratorOptionId]: <DecoratorOption>{ allowMultiple, inherit } })
        }
    }
    return result
}

function getTypeOverrideFromDecorator(decorators: any[]) {
    const noopOverride = decorators.find((x: NoopDecorator): x is NoopDecorator => x.kind === "Noop")
    const arrayOverride = decorators.find((x: ArrayDecorator): x is ArrayDecorator => x.kind === "Array")
    const override = decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")
    if (noopOverride && noopOverride.type) {
        return { type: noopOverride.type(), target: noopOverride.target }
    }
    else if (arrayOverride) {
        return { type: [arrayOverride.type], target: arrayOverride.target }
    }
    else if (override) {
        const result = Array.isArray(override.type) || typeof override.type === "string" ? override.type :
            metadata.isCallback(override.type) ? override.type({}) : override.type
        return { type: result, target: override.target }
    }
}

class GenericMap {
    private maps: Map<string, TypeOverride>[] = []
    constructor(types: Class[]) {
        this.maps = this.createMaps(types)
    }
    private createMaps(types: Class[]) {
        const result = []
        for (const type of types) {
            const parent: Class = Object.getPrototypeOf(type)
            const templates = this.getTemplates(parent)
            if (!templates) throw new Error(`Configuration Error: ${parent.name} uses string template type @reflect.type(<string>) but doesn't specify @generic.template()`)
            const types = this.getTypes(type)
            if (!types) throw new Error(`Configuration Error: ${type.name} inherit from generic class but doesn't use @generic.type()`)
            if (templates.length !== types.length) throw new Error(`Configuration Error: Number of parameters mismatch between @generic.template() on ${parent.name} and @generic.type() on ${type.name}`)
            result.unshift(new Map(templates.map((x, i) => ([x, types[i]]))))
        }
        return result
    }
    private getTemplates(target: Class) {
        const decorator = getDecorators(target, "Class", target.name)
            .find((x: GenericTemplateDecorator): x is GenericTemplateDecorator => x.kind === "GenericTemplate")
        return decorator?.templates
    }
    private getTypes(target: Class) {
        const decorator = getDecorators(target, "Class", target.name)
            .find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind === "GenericType")
        return decorator?.types
    }
    get(rawType: string | string[]) {
        const isArray = Array.isArray(rawType)
        const type = isArray ? rawType[0] : rawType
        const result = this.maps.reduce((val, map) => {
            // keep looking at the real type
            // if it is string then it still a generic type template
            return typeof val === "string" ? map.get(val) : val
        }, type as TypeOverride | undefined)
        return isArray ? [result] : result
    }
}

// --------------------------------------------------------------------- //
// ------------------------- PURIFIER VISITORS ------------------------- //
// --------------------------------------------------------------------- //

namespace visitors {
    export function addsDesignTypes(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        const getType = (type: any, i: number) => type[i] === Array ? [Object] : type[i]
        if (meta.kind === "Method") {
            const returnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, ctx.target.prototype, meta.name)
            return { ...meta, returnType }
        }
        else if (metadata.isParameterProperties(meta)) {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Property") {
            const type: any = Reflect.getOwnMetadata(DESIGN_TYPE, ctx.target.prototype, meta.name)
            return { ...meta, type }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Constructor") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Method") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, ctx.target.prototype, ctx.parent.name) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else
            return meta
    }

    export function addsDecorators(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        if (meta.kind === "Parameter" || metadata.isParameterProperties(meta)) {
            const targetName = meta.kind === "Parameter" ? ctx.parent.name : "constructor"
            const decorators = getDecorators(ctx.target, "Parameter", targetName, meta.index)
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        else if (meta.kind === "Method" || meta.kind === "Property" || meta.kind === "Class") {
            const decorators = getDecorators(ctx.target, meta.kind, meta.name)
            return { ...meta, decorators: meta.decorators.concat(decorators) }
        }
        return meta
    }

    export function addsTypeOverridden(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        const overridden = getTypeOverrideFromDecorator(meta.decorators)
        if (meta.kind === "Method")
            return { ...meta, returnType: overridden?.type ?? meta.returnType }
        return { ...meta, type: overridden?.type ?? meta.type }
    }

    export function addsGenericOverridden(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection {
        const isGenericTemplate = (x: MethodReflection | PropertyReflection | ParameterReflection) => {
            const decorator = getTypeOverrideFromDecorator(x.decorators)
            if (!decorator) return false
            const type = Array.isArray(decorator.type) ? decorator.type[0] : decorator.type
            return typeof type === "string"
        }
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        // if current class has @generic.template() then process
        if (meta.kind === "Method") {
            // if type is not a generic template type then return immediately
            if (!isGenericTemplate(meta)) return meta
            const returnType = new GenericMap(ctx.classPath).get(meta.returnType)
            return { ...meta, returnType }
        }
        if (!isGenericTemplate(meta)) return meta
        const type = new GenericMap(ctx.classPath).get(meta.type)
        return { ...meta, type }
    }

    export function addsTypeClassification(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        const get = (type: any): "Class" | "Array" | "Primitive" | undefined => {
            if (type === undefined) return undefined
            else if (Array.isArray(type)) return "Array"
            else if (metadata.isCustomClass(type)) return "Class"
            else return "Primitive"
        }
        if (meta.kind === "Method")
            return { ...meta, typeClassification: get(meta.returnType) }
        else if (meta.kind === "Property" || meta.kind === "Parameter")
            return { ...meta, typeClassification: get(meta.type) }
        else if (meta.kind === "Class")
            return { ...meta, typeClassification: "Class" }
        return meta
    }

    export function addsParameterProperties(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        if (metadata.isParameterProperties(meta) && ctx.parent.kind === "Class") {
            const isParamProp = ctx.parent.decorators.some((x: ParameterPropertiesDecorator) => x.type === "ParameterProperties")
            return !!isParamProp ? meta : undefined
        }
        return meta
    }

    export function removeIgnored(meta: TypedReflection, ctx: WalkMemberContext): TypedReflection | undefined {
        if (meta.kind === "Property" || meta.kind === "Method") {
            const decorator = meta.decorators.find((x: PrivateDecorator): x is PrivateDecorator => x.kind === "Ignore")
            return !decorator ? meta : undefined
        }
        return meta
    }
}

// --------------------------------------------------------------------- //
// ------------------------------ WALKERS ------------------------------ //
// --------------------------------------------------------------------- //


/**
 * Walk into type member metadata (properties, parameters, methods, ctor etc)
 * @param meta type metadata
 * @param ctx traversal context
 */
function walkMetadataMembers(meta: TypedReflection, ctx: WalkMemberContext) {
    // apply visitor for each metadata traversed
    const result = ctx.visitor(meta, ctx)
    for (const key in result) {
        // walk into type metadata members specified
        if (["parameters", "properties", "methods", "ctor"].some(x => x === key)) {
            const item: TypedReflection | TypedReflection[] = (result as any)[key]
            if (Array.isArray(item)) {
                const node = item.map((x, i) => walkMetadataMembers(x, { ...ctx, parent: result }));
                (result as any)[key] = node.filter(x => !!x)
            }
            else {
                const node = walkMetadataMembers(item, { ...ctx, parent: item });
                (result as any)[key] = node
            }
        }
    }
    return result as ClassReflection
}

function walkMembers(type: Class, visitor: WalkVisitor, classPath: Class[]) {
    const rawMeta = parseClass(type)
    return walkMetadataMembers(rawMeta, { visitor, parent: rawMeta, target: type, classPath })
}

/**
 * Walk into type super class
 * @param type type to reflect
 */
function walkClass(type: Class, ctx: WalkClassContext): ClassReflection {
    // walk first into the parent members
    const parent: Class = Object.getPrototypeOf(type)
    if (parent.prototype) {
        // walk the super class member first
        const parentMeta = walkClass(parent, { ...ctx, classPath: ctx.classPath.concat(type) })
        // then walk the current type members
        const childMeta = walkMembers(type, ctx.visitor, ctx.classPath)
        // merge current type and super class members
        return extendsMetadata(childMeta, parentMeta)
    }
    else {
        return walkMembers(type, ctx.visitor, ctx.classPath)
    }
}

export { walkClass, visitors, WalkVisitor, GenericMap }