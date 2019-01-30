import "reflect-metadata"


/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */
type Class = new (...arg: any[]) => any
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property" | "Constructor"
export interface Decorator { targetType: DecoratorTargetType, target: string, value: any }
export interface ParameterDecorator extends Decorator { targetType: "Parameter", targetIndex: number }
export type Reflection = ParameterReflection | FunctionReflection | PropertyReflection | MethodReflection | ClassReflection | ObjectReflection
export interface ReflectionBase { kind: string, name: string }
export interface ParameterReflection extends ReflectionBase { kind: "Parameter", decorators: any[], type?: any }
export interface PropertyReflection extends ReflectionBase { kind: "Property", decorators: any[], type?: any, get: any, set: any }
export interface MethodReflection extends ReflectionBase { kind: "Method", parameters: ParameterReflection[], returnType: any, decorators: any[] }
export interface ConstructorReflection extends ReflectionBase { kind: "Constructor", parameters: ParameterReflection[] }
export interface FunctionReflection extends ReflectionBase { kind: "Function", parameters: ParameterReflection[], returnType: any }
export interface ClassReflection extends ReflectionBase { kind: "Class", ctor: ConstructorReflection, methods: MethodReflection[], properties: PropertyReflection[], decorators: any[], type: Class }
export interface ObjectReflection extends ReflectionBase { kind: "Object", members: Reflection[] }
export interface ArrayDecorator { kind: "Array", type: Class }
export interface TypeDecorator { kind: "Override", type: Class, info?: string }
export interface PrivateDecorator { kind: "Ignore" }
interface CacheItem { key: string | Class, result: Reflection }

export const DECORATOR_KEY = "plumier.key:DECORATOR"
export const DESIGN_TYPE = "design:type"
export const DESIGN_PARAMETER_TYPE = "design:paramtypes"
export const DESIGN_RETURN_TYPE = "design:returntype"
const CACHE: CacheItem[] = []


/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

//logic from https://github.com/goatslacker/get-parameter-names
function cleanUp(fn: string) {
    return fn
        //strive comments
        .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '')
        //strive lambda
        .replace(/=>.*$/mg, '')
        //strive default params
        .replace(/=[^,]+/mg, '');
}

export function getParameterNames(fn: Function) {
    const code = cleanUp(fn.toString())
    const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);
    return result === null ? [] : result;
}

export function getConstructorParameters(fn: Class) {
    const regex = /constructor\s*\(\s*([^]*?)\)\s*\{/mg
    const result = regex.exec(fn.toString())
    if (!result) return []
    const match = cleanUp(result[1])
    return match.split(",").map(x => x.trim()).filter(x => !!x)
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
    else
        return "Object"
}

export function getDeepMembers(fun: Function) {
    const isGetter = (x: any, name: string) => Object.getOwnPropertyDescriptor(x, name)!.get
    const isFunction = (x: any, name: string) => typeof x[name] === "function";
    function deepFunctions(x: any): string[] {
        const members = Object.getOwnPropertyNames(x)
            .filter(name => isGetter(x, name) || isFunction(x, name))
        const properties = (Reflect.getOwnMetadata(DECORATOR_KEY, x.constructor) || [])
            .filter((x: Decorator) => x.targetType === "Property")
            .map((x: Decorator) => x.target)
        return members.concat(properties)
    }
    const distinctDeepFunctions = (x: any) => Array.from(new Set(deepFunctions(x)));
    return distinctDeepFunctions(fun.prototype).filter(name => name !== "constructor" && !~name.indexOf("__"))
}


function addDecorator<T extends Decorator>(target: any, decorator: T) {
    const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target) || []
    decorators.push(decorator)
    Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
}

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

export function getDecorators(target: any): Decorator[] {
    return Reflect.getMetadata(DECORATOR_KEY, target) || []
}


/* ---------------------------------------------------------------- */
/* ------------------------- CACHE FUNCTIONS ---------------------- */
/* ---------------------------------------------------------------- */

function getCache(key: string | Class) {
    return CACHE.find(x => x.key === key)
}

function setCache(key: string | Class, result: Reflection) {
    CACHE.push({ key, result })
    return result
}


/* ---------------------------------------------------------------- */
/* ------------------------- MAIN FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

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

function reDecorateParameter(decs: Decorator[], method: string, index: number, par: ParameterReflection): ParameterReflection {
    const decorators = (<ParameterDecorator[]>decs)
        .filter((x) => x.targetType == "Parameter" && x.target == method && x.targetIndex == index)
        .map(x => ({ ...x.value }))
    return {
        ...par, decorators, type: getReflectionType(decorators, par.type)
    }
}

function reDecorateMethod(decs: Decorator[], fn: MethodReflection): MethodReflection {
    const decorators = decs.filter(x => x.targetType == "Method" && x.target == fn.name).map(x => ({ ...x.value }))
    return {
        ...fn,
        decorators,
        parameters: fn.parameters.map((x, i) => reDecorateParameter(decs, fn.name, i, x)),
        returnType: getReflectionType(decorators, fn.returnType)
    }
}

function reDecorateProperty(decs: Decorator[], ref: PropertyReflection): PropertyReflection {
    const decorators = decs.filter(x => x.targetType == "Property" && x.target == ref.name).map(x => ({ ...x.value }))
    return {
        ...ref,
        decorators,
        type: getReflectionType(decorators, ref.type)
    }
}

function reDecorateClass(decs: Decorator[], reflection: ClassReflection): ClassReflection {
    const notPrivate = (x: { decorators: any[] }) => !x.decorators.some((x: PrivateDecorator) => x.kind === "Ignore")
    const decorators = decs.filter(x => x.targetType == "Class" && x.target == reflection.name).map(x => ({ ...x.value }))
    const methods = reflection.methods.map(x => reDecorateMethod(decs, x))
    const ctorParameters = reflection.ctor.parameters.map((x, i) => reDecorateParameter(decs, "constructor", i, x))
    const properties = reflection.properties.map(x => reDecorateProperty(decs, x))
    let ctorProperties: PropertyReflection[] = []
    if (decorators.some(x => x.type === "ParameterProperties")) {
        ctorProperties = ctorParameters
            .map(x => <PropertyReflection>{
                decorators: x.decorators, type: x.type,
                name: x.name, kind: "Property", get: undefined, set: undefined
            })
    }
    return <ClassReflection>{
        ...reflection, decorators,
        ctor: {
            kind: "Constructor",
            parameters: ctorParameters,
            name: "constructor"
        },
        methods: methods.filter(x => notPrivate(x)),
        properties: properties.concat(ctorProperties).filter(x => notPrivate(x)),
    }
}

function reflectParameter(name: string, typeAnnotation?: any): ParameterReflection {
    return { kind: "Parameter", name, decorators: [], type: typeAnnotation }
}

function reflectFunction(fn: Function): FunctionReflection {
    const parameters = getParameterNames(fn).map(x => reflectParameter(x))
    return { kind: "Function", name: fn.name, parameters, returnType: undefined }
}

function reflectMethod(clazz: Class, method: Function): MethodReflection {
    const parType: any[] = Reflect.getMetadata(DESIGN_PARAMETER_TYPE, clazz.prototype, method.name) || []
    const returnType: any = Reflect.getMetadata(DESIGN_RETURN_TYPE, clazz.prototype, method.name)
    const parameters = getParameterNames(method).map((x, i) => reflectParameter(x, parType[i]))
    return { kind: "Method", name: method.name, parameters, decorators: [], returnType }
}

function reflectProperty(name: string, type: Class, get: any, set: any): PropertyReflection {
    return { kind: "Property", name, type: type, decorators: [], get, set }
}

function reflectMember(clazz: Class, name: string) {
    const type: any = Reflect.getMetadata(DESIGN_TYPE, clazz.prototype, name)
    const des = Reflect.getOwnPropertyDescriptor(clazz.prototype, name)
    if (des && typeof des.value === "function" && !des.get && !des.set) {
        return reflectMethod(clazz, clazz.prototype[name])
    }
    else {
        return reflectProperty(name, type, des && des.get, des && des.set)
    }
}

function reflectConstructor(fn: Class): ConstructorReflection {
    const parTypes: any[] = Reflect.getMetadata(DESIGN_PARAMETER_TYPE, fn) || []
    const params = getConstructorParameters(fn)
    return {
        kind: "Constructor",
        name: "constructor",
        parameters: params.map((x, i) => reflectParameter(x, parTypes[i]))
    }
}

function reflectClass(fn: Class): ClassReflection {
    const members = getDeepMembers(fn).map(x => reflectMember(fn, x))
    const ctorParameters = reflectConstructor(fn)
    const decorators = getDecorators(fn)
    return reDecorateClass(decorators, {
        kind: "Class",
        ctor: ctorParameters,
        name: fn.name,
        methods: members.filter((x): x is MethodReflection => x.kind === "Method"),
        properties: members.filter((x): x is PropertyReflection => x.kind === "Property"),
        decorators: [],
        type: fn
    })
}

function reflectClassRecursive(fn: Class): ClassReflection {
    const defaultRef: ClassReflection = {
        kind: "Class", type: Object, name: "Object",
        ctor: {} as ConstructorReflection,
        methods: [], properties: [], decorators: []
    }
    function removeDuplicate<T extends Reflection>(reflections: T[]): T[] {
        const seen: { [key: string]: boolean } = {}
        const result:T[] = []
        for (let i = 0; i < reflections.length; i++) {
            const element = reflections[i];
            if(!seen[element.name]){
                result.push(element)
                seen[element.name]=true
            }
        }
        return result;
    }
    function merge(child: ClassReflection, parent: ClassReflection): ClassReflection {
        return {
            kind: "Class", type: child.type, name: child.name,
            ctor: child.ctor,
            //merge only methods, properties and decorators
            methods: removeDuplicate(child.methods.concat(parent.methods)),
            properties: removeDuplicate(child.properties.concat(parent.properties)),
            decorators: child.decorators.concat(parent.decorators),
        }
    }
    const childMeta = reflectClass(fn)
    const parent = Object.getPrototypeOf(fn)
    const parentMeta = parent.prototype ? reflectClass(parent) : defaultRef
    return merge(childMeta, parentMeta)
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
    const cache = getCache(option)
    if (!!cache) return cache.result
    if (typeof option === "string") {
        return setCache(option, reflectObject(require(option)))
    }
    else {
        return setCache(option, reflectClassRecursive(option))
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
reflect.type = function (type: Class, info?: string) {
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