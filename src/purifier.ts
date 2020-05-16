import { parseClass } from "./parser"
import {
    ArrayDecorator,
    ClassReflection,
    DecoratorId,
    DecoratorOption,
    DecoratorOptionId,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    ParameterPropertiesDecorator,
    ParameterPropertyReflection,
    PrivateDecorator,
    Reflection,
    TypeDecorator,
    TypedReflection,
    Class,
    DecoratorTargetType,
    NativeDecorator,
    DECORATOR_KEY,
    NativeParameterDecorator,
    GenericTypeDecorator,
    GenericTemplateDecorator,
    NoopDecorator,
} from "./types"
import { metadata } from "./helpers"

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function isParameterProperties(meta: any): meta is ParameterPropertyReflection {
    return meta && meta.kind === "Property" && (meta as ParameterPropertyReflection).isParameter
}

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

function getParents(target: Class): Class[] {
    return target.prototype ? [...getParents(Object.getPrototypeOf(target)), target] : [Object]
}

// --------------------------------------------------------------------- //
// ------------------------------ PURIFIER ----------------------------- //
// --------------------------------------------------------------------- //

type ReflectionVisitor = (value: TypedReflection, ctx: TraverseContext) => TypedReflection | undefined

interface TraverseContext {
    target: Class
    parent: Reflection
    visitor: ReflectionVisitor
}

function createVisitors(...visitors: ReflectionVisitor[]): ReflectionVisitor {
    return (value, ctx) => {
        return visitors.reduce((a, b) => !!a ? b(a, ctx) : a, value as any)
    }
}

function purifyTraversal(meta: any, ctx: TraverseContext) {
    const result = ctx.visitor(meta, ctx)
    for (const key in result) {
        if (["parameters", "properties", "methods", "ctor"].some(x => x === key)) {
            const item: TypedReflection | TypedReflection[] = (result as any)[key]
            if (Array.isArray(item)) {
                const node = item.map((x, i) => purifyTraversal(x, { ...ctx, parent: result }));
                (result as any)[key] = node.filter(x => !!x)
            }
            else {
                const node = purifyTraversal(item, { ...ctx, parent: item });
                (result as any)[key] = node
            }
        }
    }
    return result
}

// --------------------------------------------------------------------- //
// ------------------------------ EXTENDER ----------------------------- //
// --------------------------------------------------------------------- //

function traverseArray(childItem: TypedReflection[], parentItem: TypedReflection[]): (TypedReflection | undefined)[] {
    const items = []
    // iterate all child nodes
    for (let i = 0; i < childItem.length; i++) {
        const ch = childItem[i]
        const prn = parentItem.find(x => x.name === ch.name);
        items.push(traverse(ch, prn))
    }
    // iterate only non existed parent nodes
    for (const prn of parentItem) {
        const ch = childItem.find(x => x.name === prn.name)
        if (!ch)
            items.push(traverse(ch, prn))
    }
    return items.filter(x => !!x)
}

function traverse(child?: TypedReflection, parent?: TypedReflection) {
    const result = extendsNode(child, parent)
    for (const key in child) {
        if (["parameters", "properties", "methods", "ctor"].some(x => x === key)) {
            const childItem: TypedReflection | TypedReflection[] = (child as any)[key]
            if (Array.isArray(childItem)) {
                const parentItem: TypedReflection[] = (parent || {} as any)[key] || [];
                (result as any)[key] = traverseArray(childItem, parentItem);
            }
            else {
                const parentItem: TypedReflection = (parent as any)[key]
                const node = traverse(childItem, parentItem);
                (result as any)[key] = node
            }
        }
    }
    return result
}

function extendsNode(child?: TypedReflection, parent?: TypedReflection): TypedReflection | undefined {
    // don't extends constructor
    if (child && child.kind === "Constructor") return child
    // parent parameter should not be copied
    if (!child && parent!.kind === "Parameter")
        return undefined
    // parameter property: copy parent index to get proper design type information
    if (isParameterProperties(child) && isParameterProperties(parent))
        return { ...child, owner: [...parent.owner, ...child.owner], index: parent.index }
    // extends owner for all node except constructor
    if (child && parent && parent.kind !== "Constructor")
        return { ...child, owner: [...parent.owner, ...child.owner] }
    // if child not exists, by default just copy parent
    return child ?? parent
}

function extendsClass(meta: ClassReflection): ClassReflection {
    const objectGraph: ClassReflection = {
        kind: "Class", type: Object, name: "Object",
        ctor: { kind: "Constructor", name: "constructor", parameters: [] },
        methods: [], properties: [], decorators: [],
        super: Object,
        owner: [Object]
    }
    const parent = Object.getPrototypeOf(meta.type)
    const parentMeta = parent.prototype ? extendsClass(parseClass(parent)) : objectGraph
    return traverse(meta, parentMeta) as ClassReflection
}

// --------------------------------------------------------------------- //
// ------------------------- PURIFIER VISITORS ------------------------- //
// --------------------------------------------------------------------- //

namespace visitors {
    export function addSuperclassMeta(meta: TypedReflection, ctx: TraverseContext): TypedReflection {
        if (meta.kind === "Class")
            return extendsClass(meta)
        return meta
    }

    export function addsDesignTypes(meta: TypedReflection, ctx: TraverseContext): TypedReflection {
        const getType = (type: any, i: number) => type[i] === Array ? [Object] : type[i]
        if (meta.kind === "Method") {
            const returnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, meta.owner[0].prototype, meta.name)
            return { ...meta, returnType }
        }
        else if (isParameterProperties(meta)) {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, meta.owner[0]) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Property") {
            const type: any = Reflect.getOwnMetadata(DESIGN_TYPE, meta.owner[0].prototype, meta.name)
            return { ...meta, type }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Constructor") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, meta.owner[0]) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else if (meta.kind === "Parameter" && ctx.parent.kind === "Method") {
            const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, meta.owner[0].prototype, ctx.parent.name) || []
            return { ...meta, type: getType(parTypes, meta.index) }
        }
        else
            return meta
    }

    function extendDecorators(ownDecorators: any[], parentDecorators: any[]) {
        const result = [...ownDecorators]
        for (const decorator of parentDecorators) {
            const options: DecoratorOption = decorator[DecoratorOptionId]!
            // continue, if the decorator is not inheritable
            if (!options.inherit) continue
            // continue, if allow multiple and already has decorator with the same ID
            if (!options.allowMultiple && ownDecorators.some(x => x[DecoratorId] === decorator[DecoratorId])) continue
            result.push(decorator)
        }
        return result
    }

    export function addsDecorators(meta: TypedReflection, ctx: TraverseContext): TypedReflection {
        const flat = (d: any[][]) => ([] as any[]).concat(...d)
        const getOwners = (owners: Class[]): [Class, Class[]] => [ctx.target, owners.filter(x => x !== ctx.target)]
        if (meta.kind === "Parameter" || isParameterProperties(meta)) {
            const targetName = meta.kind === "Parameter" ? ctx.parent.name : "constructor"
            const [owner, parents] = getOwners(meta.owner)
            const ownDecorators = getDecorators(owner, "Parameter", targetName, meta.index)
            const parentDecorators = parents.map(x => getDecorators(x, "Parameter", targetName, meta.index))
            return { ...meta, decorators: extendDecorators(ownDecorators, flat(parentDecorators)) }
        }
        else if (meta.kind === "Method" || meta.kind === "Property" || meta.kind === "Class") {
            const [owner, parents] = getOwners(meta.owner)
            const ownDecorators = getDecorators(owner, meta.kind, meta.name)
            const parentDecorators = parents.map(x => getDecorators(x, meta.kind, meta.kind === "Class" ? x.name : meta.name))
            return { ...meta, decorators: extendDecorators(ownDecorators, flat(parentDecorators)) }
        }
        return meta
    }

    function getOverride(decorators: any[]) {
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
                metadata.isConstructor(override.type) ? override.type : (override.type as any)()
            return { type: result, target: override.target }
        }
    }

    export function addsTypeOverridden(meta: TypedReflection, ctx: TraverseContext): TypedReflection {
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        const overridden = getOverride(meta.decorators)
        if (meta.kind === "Method")
            return { ...meta, returnType: overridden?.type ?? meta.returnType }
        return { ...meta, type: overridden?.type ?? meta.type }
    }


    export function addsGenericOverridden(meta: TypedReflection, ctx: TraverseContext): TypedReflection {
        /*
        steps
        1. Check if type is of type string 
        2. Get the `target` property of the @type decorator. The target property is the parent generic
        3. Get @generic.template of the target property contains list of template type string
        4. Get list of parents classes of `ctx.target`, the order is like: [... GrandParent, Parent, Class]
        5. Get class inherit the generic type (it MUST be the next class of the target - Generic class IS ALWAYS the direct child)
        6. If the inherited class is undefined, its mean the member owned by the generic class itself, return the type (string) immediately
        6. Get @generic.type of the inherited class contains list of types
        7. Create map of <String, Class> from list step 3 and step 6 
        8. Resolve the type of step 1 using map from step 7
        */
        if (meta.kind === "Constructor" || meta.kind === "Class") return meta
        const getGenericTypeDecorator = (target: Class) => {
            const decorator = getDecorators(target, "Class", target.name).find((x: GenericTypeDecorator): x is GenericTypeDecorator => x.kind === "GenericType")
            return decorator?.types
        }
        const getGenericTemplateDecorator = (target: Class) => {
            const decorator = getDecorators(target, "Class", target.name).find((x: GenericTemplateDecorator): x is GenericTemplateDecorator => x.kind === "GenericTemplate")
            return decorator?.templates
        }
        const isString = (type: any): type is string | string[] => {
            return typeof type === "string" || (Array.isArray(type) && typeof type[0] === "string")
        }
        const getConversion = (decorators: any[], original: any) => {
            const overridden = getOverride(decorators)
            if (!overridden) return original
            const rawType = overridden.type;
            if (isString(rawType)) {
                const type = Array.isArray(rawType) ? rawType[0] : rawType
                const templates = getGenericTemplateDecorator(overridden.target)
                if (!templates) throw new Error(`Configuration Error: ${meta.kind} "${meta.name}" on ${overridden.target.name} uses generic type "${type}" but doesn't specify generic template @generic.template()`)
                const parents = getParents(ctx.target)
                const idx = parents.findIndex(x => x === overridden.target)
                const inherited = parents[idx + 1] as Class | undefined
                if (!inherited) return rawType
                const types = getGenericTypeDecorator(inherited)
                if (!types) throw new Error(`Configuration Error: ${inherited.name} inherited from generic type ${overridden.target.name} but doesn't specify generic type @generic.type()`)
                if (types.length !== templates.length) throw new Error(`Configuration Error: Number of parameter passed on ${overridden.target.name} @generic.template() doesn't match with inherited type ${inherited.name} @generic.type()`)
                const map = new Map(templates.map((x, i) => ([x, types[i]])))
                const conversion = map.get(type)
                return Array.isArray(rawType) ? [conversion] : conversion
            }
            return rawType
        }
        if (meta.kind === "Method") {
            const returnType = getConversion(meta.decorators, meta.returnType)
            return { ...meta, returnType }
        }
        const type = getConversion(meta.decorators, meta.type)
        return { ...meta, type }
    }

    export function addsTypeClassification(meta: TypedReflection, ctx: TraverseContext): TypedReflection | undefined {
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

    export function addsParameterProperties(meta: TypedReflection, ctx: TraverseContext): TypedReflection | undefined {
        if (isParameterProperties(meta) && ctx.parent.kind === "Class") {
            const isParamProp = ctx.parent.decorators.some((x: ParameterPropertiesDecorator) => x.type === "ParameterProperties")
            return !!isParamProp ? meta : undefined
        }
        return meta
    }

    export function removeIgnored(meta: TypedReflection, ctx: TraverseContext): TypedReflection | undefined {
        if (meta.kind === "Property" || meta.kind === "Method") {
            const decorator = meta.decorators.find((x: PrivateDecorator): x is PrivateDecorator => x.kind === "Ignore")
            return !decorator ? meta : undefined
        }
        return meta
    }
}

export { visitors, purifyTraversal, createVisitors, extendsClass }