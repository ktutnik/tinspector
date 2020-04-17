import { Node, parse } from "acorn"

import {
    Class,
    ClassReflection,
    ConstructorReflection,
    DecoratorIterator,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    FunctionReflection,
    MethodReflection,
    ObjectReflection,
    ParameterReflection,
    PropertyReflection,
    Reflection,
    DECORATOR_KEY,
    Decorator,
    ArrayDecorator,
    TypeDecorator,
    DecoratorTargetType,
    ParamDecorator,
    DecoratorOption,
    PrivateDecorator,
    DecoratorId,
} from "./types"
import { isConstructor, isCustomClass, useCache } from "./helpers"
import { extendClass } from "./extends";
import { decorate, decorateClass } from "./decorators";


// --------------------------------------------------------------------- //
// ------------------------------ HELPERS ------------------------------ //
// --------------------------------------------------------------------- //
const cacheStore = new Map<string | Class, Reflection>()

function printDestruct(params: any[]) {
    const result: string[] = []
    for (const key in params) {
        const par = params[key];
        if (typeof par === "string")
            result.push(par)
        else {
            const key = Object.keys(par)[0]
            result.push(`${key}: ${printDestruct(par[key])}`)
        }
    }
    return `{ ${result.join(", ")} }`
}

function getTypeClassification(type: any): "Class" | "Array" | "Primitive" | undefined {
    if (type === undefined) return undefined
    else if (Array.isArray(type)) return "Array"
    else if (isCustomClass(type)) return "Class"
    else return "Primitive"
}

function getNode(node: Node, criteria: (x: any) => boolean): Node | undefined {
    if (criteria(node)) return node
    if (!(node as any).body) return
    if (Array.isArray((node as any).body)) {
        for (const child of (node as any).body) {
            const result = getNode(child, criteria)
            if (result) return result
        }
    }
    return getNode((node as any).body, criteria)
}

function getNamesFromAst(nodes: any[]) {
    const getName = (node: any): undefined | string | { [key: string]: string[] } => {
        if (node.type === "Identifier") return node.name
        if (node.type === "AssignmentPattern") return node.left.name
        if (node.type === "RestElement") return node.argument.name
        if (node.type === "Property") {
            if (node.value.type === "Identifier") return node.value.name
            else {
                const result: { [key: string]: any } = {}
                result[node.key.name] = getName(node.value)
                return result
            }
        }
        //if (node.type === "ObjectPattern") {
        return node.properties.map((x: any) => getName(x))
        //}
    }
    return nodes.map(x => getName(x)).filter((x): x is string | { [key: string]: string[] } => !!x)
}

function getParameterNames(fn: Function) {
    try {
        const body = fn.toString()
        const ast = parse(body)
        return getNamesFromAst((ast as any).body[0].params)
    }
    catch {
        return []
    }
}

function getMethodParameters(fn: Class, method: string) {
    const body = fn.toString()
    const ast = parse(body)
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "method" && x.key.name === method)
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}

function getConstructorParameters(fn: Class) {
    const body = fn.toString()
    const ast = parse(body)
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "constructor")
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}


function getType(object: any) {
    if (typeof object === "function") {
        if (isConstructor(object)) return "Class"
        else return "Function"
    }
    else if (Array.isArray(object))
        return "Array"
    else if (typeof object === "boolean"
        || typeof object === "number"
        || typeof object === "bigint"
        || typeof object === "string"
        || typeof object === "symbol"
        || typeof object === "undefined")
        return "Value"
    else
        return "Object"
}

function getMembers(fun: Function) {
    const isGetter = (name: string) => Object.getOwnPropertyDescriptor(fun.prototype, name)!.get
    const isSetter = (name: string) => Object.getOwnPropertyDescriptor(fun.prototype, name)!.set
    const isFunction = (name: string) => typeof fun.prototype[name] === "function";
    const members = Object.getOwnPropertyNames(fun.prototype)
        .filter(name => isGetter(name) || isSetter(name) || isFunction(name))
    const properties = (Reflect.getOwnMetadata(DECORATOR_KEY, fun) || [])
        .filter((x: Decorator) => x.targetType === "Property")
        .map((x: Decorator) => x.target)
    const names = members.concat(properties)
        .filter(name => name !== "constructor" && !~name.indexOf("__"))
    return [...new Set(names)]
}


function getReflectionType(decorators: any[], type: any) {
    const array = decorators.find((x: ArrayDecorator): x is ArrayDecorator => x.kind === "Array")
    const override = decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")
    if (override)
        return override.type
    else if (array)
        return [array.type]
    else if (type === Array)
        return [Object]
    else
        return type
}


function getDecorators(target: any): Decorator[] {
    return Reflect.getOwnMetadata(DECORATOR_KEY, target) || []
}

function getDecoratorIterator(fn: any): DecoratorIterator {
    return (type: DecoratorTargetType, target: string, index?: number) => getDecorators(fn)
        .filter(x => {
            const par = x as ParamDecorator
            return x.targetType === type && x.target === target
                && (par.targetIndex === undefined || par.targetIndex === index)
        })
        .map(x => {
            const { value, inherit, allowMultiple } = x
            value[DecoratorOption] = <DecoratorOption>{ inherit, allowMultiple }
            return value
        })
}

function isIncluded(x: { decorators: any[] }) {
    return !x.decorators.some((x: PrivateDecorator) => x.kind === "Ignore")
}


// --------------------------------------------------------------------- //
// -------------------------- REFLECT FUNCTION ------------------------- //
// --------------------------------------------------------------------- //

function reflectParameter(name: string | { [key: string]: string[] }, typeAnnotation?: any, decs?: any[]): ParameterReflection {
    const decorators = decs || []
    const type = getReflectionType(decorators, typeAnnotation)
    const typeClassification = getTypeClassification(type)
    let parName
    let properties: { [key: string]: any[] } = {}
    if (typeof name === "object") {
        parName = printDestruct(name as any)
        properties = name
    }
    else {
        parName = name
    }
    return { kind: "Parameter", name: parName, type, decorators, typeClassification, properties }
}

function reflectFunction(fn: Function): FunctionReflection {
    const parameters = getParameterNames(fn).map(x => reflectParameter(x))
    return { kind: "Function", name: fn.name, parameters, returnType: undefined }
}

function reflectMethod(clazz: Class, method: string, iterator: DecoratorIterator): MethodReflection {
    const parType: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, clazz.prototype, method) || []
    const rawReturnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, clazz.prototype, method)
    const parameters = getMethodParameters(clazz, method).map((x, i) => reflectParameter(x, parType[i], iterator("Parameter", method, i)))
    const decorators = iterator("Method", method)
    const returnType = getReflectionType(decorators, rawReturnType)
    const typeClassification = getTypeClassification(returnType)
    return { kind: "Method", name: method, parameters, decorators, returnType, typeClassification }
}

function reflectProperty(name: string, typeAnnotation: Class, des: PropertyDescriptor | undefined, iterator: DecoratorIterator): PropertyReflection {
    const decorators = iterator("Property", name)
    const type = getReflectionType(decorators, typeAnnotation)
    const typeClassification = getTypeClassification(type)
    return {
        kind: "Property", name, type, decorators, typeClassification,
        get: des && des.get, set: des && des.set
    }
}

function reflectMember(clazz: Class, name: string, iterator: DecoratorIterator) {
    const type: any = Reflect.getOwnMetadata(DESIGN_TYPE, clazz.prototype, name)
    const des = Reflect.getOwnPropertyDescriptor(clazz.prototype, name)
    if (des && typeof des.value === "function" && !des.get && !des.set) {
        return reflectMethod(clazz, name, iterator)
    }
    else {
        return reflectProperty(name, type, des, iterator)
    }
}

function reflectConstructor(fn: Class, iterator: DecoratorIterator): ConstructorReflection {
    const parTypes: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, fn) || []
    const params = getConstructorParameters(fn)
    return {
        kind: "Constructor",
        name: "constructor",
        parameters: params.map((x, i) => reflectParameter(x, parTypes[i], iterator("Parameter", "constructor", i)))
    }
}

function reflectClass(fn: Class): ClassReflection {
    const iterator = getDecoratorIterator(fn)
    const members = getMembers(fn).map(x => reflectMember(fn, x, iterator))
    const ctor = reflectConstructor(fn, iterator)
    const decorators = iterator("Class", fn.name)
    const properties = members.filter((x): x is PropertyReflection => x.kind === "Property" && isIncluded(x))
    const proto = Object.getPrototypeOf(fn)
    if (decorators.some(x => x.type === "ParameterProperties")) {
        const parProps = ctor.parameters.filter(x => isIncluded(x)).map(x => <PropertyReflection>({
            decorators: x.decorators, type: x.type,
            name: x.name, kind: "Property", get: undefined, set: undefined
        }))
        properties.push(...parProps)
    }
    return {
        kind: "Class", ctor, name: fn.name,
        methods: members.filter((x): x is MethodReflection => x.kind === "Method" && isIncluded(x)),
        properties, decorators, type: fn, typeClassification: "Class",
        super: proto.prototype ? proto : Object
    }
}

function reflectClassRecursive(fn: Class): ClassReflection {
    const defaultRef: ClassReflection = {
        kind: "Class", type: Object, name: "Object",
        ctor: {} as ConstructorReflection,
        methods: [], properties: [], decorators: [],
        super: Object
    }
    const childMeta = reflectClass(fn)
    const parent = Object.getPrototypeOf(fn)
    const parentMeta = parent.prototype ? reflectClassRecursive(parent) : defaultRef
    return extendClass(childMeta, parentMeta)
}

function reflectObject(object: any, name: string = "module"): ObjectReflection {
    return {
        kind: "Object", name,
        members: Object.keys(object).map(x => traverse(object[x], x)).filter((x): x is Reflection => !!x)
    }
}

function traverse(fn: any, name: string): Reflection | undefined {
    switch (getType(fn)) {
        case "Function":
            return reflectFunction(fn)
        case "Class":
            return reflectClassRecursive(fn)
        case "Object":
            return reflectObject(fn, name)
        default:
            return
    }
}

const reflectObjectCached = useCache(cacheStore, reflectObject, x => x)
const reflectClassRecursiveCached = useCache(cacheStore, reflectClassRecursive, x => x)

/**
 * Reflect module
 * @param path module name
 */
function reflect(path: string): ObjectReflection

/**
 * Reflect class
 * @param classType Class 
 */
function reflect(classType: Class): ClassReflection
function reflect(option: string | Class) {
    if (typeof option === "string") {
        return reflectObjectCached(require(option))
    }
    else {
        return reflectClassRecursiveCached(option)
    }
}


// --------------------------------------------------------------------- //
// ----------------------------- DECORATORS ---------------------------- //
// --------------------------------------------------------------------- //

const IgnoreId = Symbol("ignore")
const OverrideId = Symbol("override")
const ArrayId = Symbol("array")
const ParamPropId = Symbol("paramProp")

/**
 * Decorator that do nothing, intended to be able to inspect data type
 */
reflect.noop = function () {
    return decorate({})
}

/**
 * Ignore member from metadata generated
 */
reflect.ignore = function () {
    return decorate(<PrivateDecorator>{ [DecoratorId]: IgnoreId, kind: "Ignore" }, ["Parameter", "Method", "Property"], { allowMultiple: false })
}

/**
 * Override type definition information. Useful to add type definition for some data type that is erased 
 * after transfile such as Partial<Type> or ReadOnly<Type>
 * 
 * If applied to parameter it will override the parameter type
 * 
 * If applied to property it will override the property type
 * 
 * if applied to method it will overrid the method return value
 * @param type The type overridden
 * @param info Additional information about type (readonly, partial etc)
 */
reflect.type = function (type: Class | Class[], info?: string) {
    return decorate(<TypeDecorator>{ [DecoratorId]: OverrideId, kind: "Override", type: type, info }, ["Parameter", "Method", "Property"], { allowMultiple: false })
}

/**
 * Add type information for array element
 * @param type Data type of array element
 */
reflect.array = function (type: Class) {
    return decorate(<ArrayDecorator>{ [DecoratorId]: ArrayId, kind: "Array", type: type }, ["Parameter", "Method", "Property"], { allowMultiple: false })
}

/**
 * Mark all constructor parameters as properties
 */
reflect.parameterProperties = function () {
    return decorateClass({ [DecoratorId]: ParamPropId, type: "ParameterProperties" }, { allowMultiple: false })
}

export { reflect, getConstructorParameters, getParameterNames, getMethodParameters, getMembers }