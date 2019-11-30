import "reflect-metadata"
import { parse, Node } from "acorn"

/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */
type Class = new (...arg: any[]) => any
type DecoratorIterator = (type: DecoratorTargetType, target: string, index?: number) => any[]
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property" | "Constructor"
export interface Decorator { targetType: DecoratorTargetType, target: string, value: any }
export interface ParameterDecorator extends Decorator { targetType: "Parameter", targetIndex: number }
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
                const result: { [key: string]: any } ={}
                result[node.key.name] = getName(node.value)
                return result
            }
        }
        if (node.type === "ObjectPattern") {
            return node.properties.map((x: any) => getName(x))
        }
    }
    return nodes.map(x => getName(x)).filter((x): x is string | { [key: string]: string[] } => !!x)
}

export function getParameterNames(fn: Function) {
    const body = fn.toString()
    const src = !body.startsWith("function") ? "function " + body : body
    try {
        const ast = parse(src)
        return getNamesFromAst((ast as any).body[0].params)
    }
    catch {
        return []
    }
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
    const isFunction = (name: string) => typeof fun.prototype[name] === "function";
    const members = Object.getOwnPropertyNames(fun.prototype)
        .filter(name => isGetter(name) || isFunction(name))
    const properties = (Reflect.getOwnMetadata(DECORATOR_KEY, fun) || [])
        .filter((x: Decorator) => x.targetType === "Property")
        .map((x: Decorator) => x.target)
    return members.concat(properties)
        .filter(name => name !== "constructor" && !~name.indexOf("__"))
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
            const par = x as ParameterDecorator
            return x.targetType === type && x.target === target
                && (par.targetIndex === undefined || par.targetIndex === index)
        })
        .map(x => x.value)
}

function getReflectionType(decorators: any[], type: any) {
    const array = decorators.find((x: ArrayDecorator): x is ArrayDecorator => x.kind === "Array")
    const override = decorators.find((x: TypeDecorator): x is TypeDecorator => x.kind === "Override")
    if (override)
        return override.type
    else if (array)
        return [array.type]
    else
        return type
}

function removeDuplicate<T extends Reflection>(reflections: T[]): T[] {
    const seen: { [key: string]: boolean } = {}
    const result: T[] = []
    for (let i = 0; i < reflections.length; i++) {
        const element = reflections[i];
        if (!seen[element.name]) {
            result.push(element)
            seen[element.name] = true
        }
    }
    return result;
}

/*
Decorator is not inherited by design due to TypeScript behavior that use decorator to provide type information,
except on inherited method/properties that is not overridden in the child class.
*/
function extendsClass(child: ClassReflection, parent: ClassReflection): ClassReflection {
    return {
        kind: "Class", type: child.type, name: child.name,
        ctor: child.ctor, typeClassification: child.typeClassification,
        decorators: child.decorators,
        //merge only methods, properties and decorators
        methods: removeDuplicate(child.methods.concat(parent.methods)),
        properties: removeDuplicate(child.properties.concat(parent.properties))
    }
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


/* ---------------------------------------------------------------- */
/* --------------------------- DECORATORS ------------------------- */
/* ---------------------------------------------------------------- */

export function decorateParameter(callback: ((target: Class, name: string, index: number) => object)): (target: any, name: string, index: number) => void
export function decorateParameter(data: {}): (target: any, name: string, index: number) => void
export function decorateParameter(data: any) {
    return decorate(data, ["Parameter"])
}

export function decorateMethod(callback: ((target: Class, name: string) => object)): (target: any, name: string) => void
export function decorateMethod(data: {}): (target: any, name: string) => void
export function decorateMethod(data: any) {
    return decorate(data, ["Method"])
}

export function decorateProperty(callback: ((target: Class, name: string, index?: any) => object)): (target: any, name: string, index?: any) => void
export function decorateProperty(data: {}): (target: any, name: string, index?: any) => void
export function decorateProperty(data: any) {
    return decorate(data, ["Property", "Parameter"])
}

export function decorateClass(callback: ((target: Class) => object)): (target: any) => void
export function decorateClass(data: {}): (target: any) => void
export function decorateClass(data: any) {
    return decorate(data, ["Class"])
}

export function decorate(data: any, targetTypes: DecoratorTargetType[] = []) {
    const throwIfNotOfType = (target: DecoratorTargetType) => {
        if (targetTypes.length > 0 && !targetTypes.some(x => x === target))
            throw new Error(`Reflect Error: Decorator of type ${targetTypes.join(", ")} applied into ${target}`)
    }

    return (...args: any[]) => {
        //class decorator
        if (args.length === 1) {
            throwIfNotOfType("Class")
            return addDecorator(args[0], {
                targetType: "Class",
                target: args[0].name,
                value: typeof data === "function" ? data(args[0]) : data
            })
        }
        //parameter decorator
        if (args.length === 3 && typeof args[2] === "number") {
            throwIfNotOfType("Parameter")
            const isCtorParam = isConstructor(args[0])
            const targetType = isCtorParam ? args[0] : args[0].constructor
            const targetName = isCtorParam ? "constructor" : args[1]
            return addDecorator<ParameterDecorator>(targetType, {
                targetType: "Parameter",
                target: targetName,
                targetIndex: args[2],
                value: typeof data === "function" ? data(targetType, targetName, args[2]) : data
            })
        }
        //property
        if (args[2] === undefined || args[2].get || args[2].set) {
            throwIfNotOfType("Property")
            return addDecorator(args[0].constructor, {
                targetType: "Property",
                target: args[1],
                value: typeof data === "function" ? data(args[0].constructor, args[1]) : data
            })
        }
        throwIfNotOfType("Method")
        return addDecorator(args[0].constructor, {
            targetType: "Method",
            target: args[1],
            value: typeof data === "function" ? data(args[0].constructor, args[1]) : data
        })
    }
}

export function mergeDecorator(...fn: Function[]) {
    return (...args: any[]) => {
        fn.forEach(x => x(...args))
    }
}

/* ---------------------------------------------------------------- */
/* ------------------------- MAIN FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

function reflectParameter(name: string | { [key: string]: string[] }, typeAnnotation?: any, decs?: any[]): ParameterReflection {
    const decorators = decs || []
    const type = getReflectionType(decorators, typeAnnotation)
    const typeClassification = getTypeClassification(type)
    let parName
    let properties: { [key: string]: string[] } = {}
    if (typeof name === "object") {
        parName = "__destruct__"
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

function reflectMethod(clazz: Class, method: Function, iterator: DecoratorIterator): MethodReflection {
    const parType: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, clazz.prototype, method.name) || []
    const rawReturnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, clazz.prototype, method.name)
    const parameters = getParameterNames(method).map((x, i) => reflectParameter(x, parType[i], iterator("Parameter", method.name, i)))
    const decorators = iterator("Method", method.name)
    const returnType = getReflectionType(decorators, rawReturnType)
    const typeClassification = getTypeClassification(returnType)
    return { kind: "Method", name: method.name, parameters, decorators, returnType, typeClassification }
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
        return reflectMethod(clazz, clazz.prototype[name], iterator)
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
    const notPrivate = (x: { decorators: any[] }) => !x.decorators.some((x: PrivateDecorator) => x.kind === "Ignore")
    const iterator = getDecoratorIterator(fn)
    const members = getMembers(fn).map(x => reflectMember(fn, x, iterator))
    const ctor = reflectConstructor(fn, iterator)
    const decorators = iterator("Class", fn.name)
    const properties = members.filter((x): x is PropertyReflection => x.kind === "Property" && notPrivate(x))
    if (decorators.some(x => x.type === "ParameterProperties")) {
        const parProps = ctor.parameters.filter(x => notPrivate(x)).map(x => <PropertyReflection>({
            decorators: x.decorators, type: x.type,
            name: x.name, kind: "Property", get: undefined, set: undefined
        }))
        properties.push(...parProps)
    }
    return {
        kind: "Class", ctor, name: fn.name,
        methods: members.filter((x): x is MethodReflection => x.kind === "Method" && notPrivate(x)),
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
    return extendsClass(childMeta, parentMeta)
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

/**
 * Ignore member from metadata generated
 */
reflect.ignore = function () {
    return decorate(<PrivateDecorator>{ kind: "Ignore" }, ["Parameter", "Method", "Property"])
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
    return decorate(<TypeDecorator>{ kind: "Override", type: type, info }, ["Parameter", "Method", "Property"])
}

/**
 * Add type information for array element
 * @param type Data type of array element
 */
reflect.array = function (type: Class) {
    return decorate(<ArrayDecorator>{ kind: "Array", type: type }, ["Parameter", "Method", "Property"])
}

/**
 * Mark all constructor parameters as properties
 */
reflect.parameterProperties = function () {
    return decorateClass({ type: "ParameterProperties" })
}


export default reflect