import { array, ignore, noop, parameterProperties, type } from "./decorators"
import { metadata, useCache } from "./helpers"
import { parseFunction } from "./parser"
import { Class, ClassReflection, ObjectReflection, Reflection } from "./types"
import { walkClass, visitors, WalkVisitor, GenericMap } from "./walker"

function reflectClass(target: Class): ClassReflection {
    const visitorOrder = [
        visitors.addsDesignTypes,
        visitors.addsDecorators,
        visitors.addsTypeOverridden,
        visitors.addsParameterProperties,
        visitors.addsGenericOverridden,
        visitors.addsTypeClassification,
        visitors.removeIgnored,
    ]
    const visitor: WalkVisitor = (value, ctx) => visitorOrder.reduce((a, b) => !!a ? b(a, ctx) : a, value as any)
    return walkClass(target, { visitor, classPath: [] })
}

function traverseObject(fn: any, name: string): Reflection | undefined {
    if (Array.isArray(fn)) return
    if (typeof fn === "object")
        return reflectObject(fn, name)
    if (typeof fn === "function" && metadata.isConstructor(fn))
        return reflectClass(fn)
    if (typeof fn === "function")
        return parseFunction(fn)
}

function reflectObject(object: any, name: string = "module"): ObjectReflection {
    return {
        kind: "Object", name,
        members: Object.keys(object).map(x => traverseObject(object[x], x)).filter((x): x is Reflection => !!x)
    }
}

// --------------------------------------------------------------------- //
// ------------------------------- CACHE ------------------------------- //
// --------------------------------------------------------------------- //


const cacheStore = new Map<string | Class, Reflection>()
const reflectObjectCached = useCache(cacheStore, reflectObject, x => x)
const reflectClassRecursiveCached = useCache(cacheStore, reflectClass, x => x)

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
