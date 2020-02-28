import "reflect-metadata"
import { parse, Node } from "acorn"


/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

export const DecoratorOption = Symbol("tinspector:decoratorOption")
export const DecoratorId = Symbol("tinspector:decoratorId")

type Class = new (...arg: any[]) => any
type DecoratorIterator = (type: DecoratorTargetType, target: string, index?: number) => any[]
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property" | "Constructor"
export interface Decorator { targetType: DecoratorTargetType, target: string, value: any, inherit: boolean, allowMultiple: boolean }
export interface ParamDecorator extends Decorator { targetType: "Parameter", targetIndex: number }
export type Reflection = ParameterReflection | FunctionReflection | PropertyReflection | MethodReflection | ClassReflection | ObjectReflection
export interface ReflectionBase { kind: string, name: string }
export interface ParameterReflection extends ReflectionBase { kind: "Parameter", properties: string | { [key: string]: string[] }, decorators: any[], type?: any, typeClassification?: "Class" | "Array" | "Primitive" }
export interface PropertyReflection extends ReflectionBase { kind: "Property", decorators: any[], type?: any, get: any, set: any, typeClassification?: "Class" | "Array" | "Primitive" }
export interface MethodReflection extends ReflectionBase { kind: "Method", parameters: ParameterReflection[], returnType: any, decorators: any[], typeClassification?: "Class" | "Array" | "Primitive" }
export interface ConstructorReflection extends ReflectionBase { kind: "Constructor", parameters: ParameterReflection[] }
export interface FunctionReflection extends ReflectionBase { kind: "Function", parameters: ParameterReflection[], returnType: any }
export interface ClassReflection extends ReflectionBase { kind: "Class", ctor: ConstructorReflection, methods: MethodReflection[], properties: PropertyReflection[], decorators: any[], type: Class, typeClassification?: "Class" | "Array" | "Primitive" }
export interface ObjectReflection extends ReflectionBase { kind: "Object", members: Reflection[] }
export interface ArrayDecorator { kind: "Array", type: Class }
export interface TypeDecorator { kind: "Override", type: Class, info?: string }
export interface PrivateDecorator { kind: "Ignore" }
export interface DecoratorOption {
    inherit?: boolean,
    allowMultiple?: boolean
}

export type PropertyDecorator = (target: Object, propertyKey: string | symbol, ...index: any[]) => void;

export const DECORATOR_KEY = "plumier.key:DECORATOR"
export const DESIGN_TYPE = "design:type"
export const DESIGN_PARAMETER_TYPE = "design:paramtypes"
export const DESIGN_RETURN_TYPE = "design:returntype"
const cacheStore = new Map<string | Class, Reflection>()

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */


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

export function getParameterNames(fn: Function) {
    try {
        const body = fn.toString()
        const ast = parse(body)
        return getNamesFromAst((ast as any).body[0].params)
    }
    catch {
        return []
    }
}

export function getMethodParameters(fn: Class, method: string) {
    const body = fn.toString()
    const ast = parse(body)
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "method" && x.key.name === method)
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}

export function getConstructorParameters(fn: Class) {
    const body = fn.toString()
    const ast = parse(body)
    const ctor = getNode(ast, x => x.type === "MethodDefinition" && x.kind === "constructor")
    return getNamesFromAst(ctor ? (ctor as any).value.params : [])
}

function isConstructor(value: Function) {
    return ("" + value).indexOf("class") == 0
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

export function getMembers(fun: Function) {
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

function isCustomClass(type: Function | Function[]) {
    switch (type) {
        case Boolean:
        case String:
        case Array:
        case Number:
        case Object:
        case Date:
            return false
        default:
            return true
    }
}

function getTypeClassification(type: any): "Class" | "Array" | "Primitive" | undefined {
    if (type === undefined) return undefined
    else if (Array.isArray(type)) return "Array"
    else if (isCustomClass(type)) return "Class"
    else return "Primitive"
}


function addDecorator<T extends Decorator>(target: any, decorator: T) {
    const decorators: Decorator[] = Reflect.getOwnMetadata(DECORATOR_KEY, target) || []
    decorators.push(decorator)
    Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
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


export function useCache<K, P extends any[], R>(cache: Map<K, R>, fn: (...args: P) => R, getKey: (...args: P) => K) {
    return (...args: P) => {
        const key = getKey(...args)
        const result = cache.get(key)
        if (!!result) return result
        else {
            const newResult = fn(...args)
            cache.set(key, newResult)
            return newResult
        }
    }
}

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

function isIncluded(x: { decorators: any[] }) {
    return !x.decorators.some((x: PrivateDecorator) => x.kind === "Ignore")
}

/* ---------------------------------------------------------------- */
/* --------------------------- DECORATORS ------------------------- */
/* ---------------------------------------------------------------- */


export function decorateParameter(callback: ((target: Class, name: string, index: number) => any), option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator {
    return decorate(data, ["Parameter"], option) as any
}

export function decorateMethod(callback: ((target: Class, name: string) => any), option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption) {
    return decorate(data, ["Method"], option)
}

export function decorateProperty(callback: ((target: Class, name: string, index?: any) => any), option?: DecoratorOption): PropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption): PropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption) {
    return decorate(data, ["Property", "Parameter"], option)
}

export function decorateClass(callback: ((target: Class) => any), option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption) {
    return decorate(data, ["Class"], option)
}

export function decorate(data: any | ((...args: any[]) => any), targetTypes: DecoratorTargetType[] = [], option?: Partial<DecoratorOption>) {
    const throwIfNotOfType = (target: DecoratorTargetType) => {
        if (targetTypes.length > 0 && !targetTypes.some(x => x === target))
            throw new Error(`Reflect Error: Decorator of type ${targetTypes.join(", ")} applied into ${target}`)
    }
    const opt: Required<DecoratorOption> = { allowMultiple: true, inherit: true, ...option }
    return (...args: any[]) => {
        //class decorator
        if (args.length === 1) {
            throwIfNotOfType("Class")
            return addDecorator(args[0], {
                targetType: "Class",
                target: args[0].name,
                value: typeof data === "function" ? data(args[0]) : data,
                ...opt
            })
        }
        //parameter decorator
        if (args.length === 3 && typeof args[2] === "number") {
            throwIfNotOfType("Parameter")
            const isCtorParam = isConstructor(args[0])
            const targetType = isCtorParam ? args[0] : args[0].constructor
            const targetName = isCtorParam ? "constructor" : args[1]
            return addDecorator<ParamDecorator>(targetType, {
                targetType: "Parameter",
                target: targetName,
                targetIndex: args[2],
                value: typeof data === "function" ? data(targetType, targetName, args[2]) : data,
                ...opt
            })
        }
        //property
        if (args[2] === undefined || args[2].get || args[2].set) {
            throwIfNotOfType("Property")
            return addDecorator(args[0].constructor, {
                targetType: "Property",
                target: args[1],
                value: typeof data === "function" ? data(args[0].constructor, args[1]) : data,
                ...opt
            })
        }
        throwIfNotOfType("Method")
        return addDecorator(args[0].constructor, {
            targetType: "Method",
            target: args[1],
            value: typeof data === "function" ? data(args[0].constructor, args[1]) : data,
            ...opt
        })
    }
}

export function mergeDecorator(...fn: (ClassDecorator | PropertyDecorator | ParamDecorator | MethodDecorator)[]) {
    return (...args: any[]) => {
        fn.forEach(x => (x as Function)(...args))
    }
}

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
        properties, decorators, type: fn, typeClassification: "Class"
    }
}

function reflectClassRecursive(fn: Class): ClassReflection {
    const defaultRef: ClassReflection = {
        kind: "Class", type: Object, name: "Object",
        ctor: {} as ConstructorReflection,
        methods: [], properties: [], decorators: []
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
export function reflect(path: string): ObjectReflection

/**
 * Reflect class
 * @param classType Class 
 */
export function reflect(classType: Class): ClassReflection
export function reflect(option: string | Class) {
    if (typeof option === "string") {
        return reflectObjectCached(require(option))
    }
    else {
        return reflectClassRecursiveCached(option)
    }
}

/* ---------------------------------------------------------------- */
/* ------------------------- DECORATORS --------------------------- */
/* ---------------------------------------------------------------- */

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

export default reflect