import { array, ignore, noop, parameterProperties, type } from "./decorators"
import { extendClass } from "./extends"
import { metadata, useCache } from "./helpers"
import {
    Class,
    ClassReflection,
    ConstructorReflection,
    Decorator,
    DECORATOR_KEY,
    DecoratorIterator,
    DecoratorOption,
    DecoratorTargetType,
    DESIGN_PARAMETER_TYPE,
    DESIGN_RETURN_TYPE,
    DESIGN_TYPE,
    FunctionReflection,
    MethodReflection,
    ObjectReflection,
    ParamDecorator,
    ParameterReflection,
    PrivateDecorator,
    PropertyReflection,
    Reflection,
} from "./types"


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


function getType(object: any) {
    if (typeof object === "function") {
        if (metadata.isConstructor(object)) return "Class"
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

function getTypeClassification(type: any): "Class" | "Array" | "Primitive" | undefined {
    if (type === undefined) return undefined
    else if (Array.isArray(type)) return "Array"
    else if (metadata.isCustomClass(type)) return "Class"
    else return "Primitive"
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
    const type = metadata.getType(decorators, typeAnnotation)
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
    const parameters = metadata.getParameterNames(fn).map(x => reflectParameter(x))
    return { kind: "Function", name: fn.name, parameters, returnType: undefined }
}


// --------------------------------------------------------------------- //
// --------------------------- REFLECT CLASS --------------------------- //
// --------------------------------------------------------------------- //

function reflectMethod(clazz: Class, method: string, iterator: DecoratorIterator): MethodReflection {
    const parType: any[] = Reflect.getOwnMetadata(DESIGN_PARAMETER_TYPE, clazz.prototype, method) || []
    const rawReturnType: any = Reflect.getOwnMetadata(DESIGN_RETURN_TYPE, clazz.prototype, method)
    const parameters = metadata.getMethodParameters(clazz, method).map((x, i) => reflectParameter(x, parType[i], iterator("Parameter", method, i)))
    const decorators = iterator("Method", method)
    const returnType = metadata.getType(decorators, rawReturnType)
    const typeClassification = getTypeClassification(returnType)
    return { kind: "Method", name: method, parameters, decorators, returnType, typeClassification }
}

function reflectProperty(name: string, typeAnnotation: Class, des: PropertyDescriptor | undefined, iterator: DecoratorIterator): PropertyReflection {
    const decorators = iterator("Property", name)
    const type = metadata.getType(decorators, typeAnnotation)
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
    const params = metadata.getConstructorParameters(fn)
    return {
        kind: "Constructor",
        name: "constructor",
        parameters: params.map((x, i) => reflectParameter(x, parTypes[i], iterator("Parameter", "constructor", i)))
    }
}

function reflectClass(fn: Class): ClassReflection {
    const iterator = getDecoratorIterator(fn)
    const members = metadata.getClassMembers(fn).map(x => reflectMember(fn, x, iterator))
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


// --------------------------------------------------------------------- //
// --------------------------- REFLECT OBJECT -------------------------- //
// --------------------------------------------------------------------- //

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

/**
 * Decorator that do nothing, intended to be able to inspect data type
 */
reflect.noop = noop

/**
 * Ignore member from metadata generated
 */
reflect.ignore = ignore

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
reflect.type = type

/**
 * Add type information for array element
 * @param type Data type of array element
 */
reflect.array = array

/**
 * Mark all constructor parameters as properties
 */
reflect.parameterProperties = parameterProperties

export { reflect }