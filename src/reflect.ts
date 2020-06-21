import { ignore, noop, parameterProperties, type } from "./decorators"
import * as decorate from "./decorators"
import { metadata, useCache, createClass } from "./helpers"
import { parseFunction } from "./parser"
import { Class, ClassReflection, ObjectReflection, Reflection } from "./types"
import { visitors, walkClass, WalkVisitor } from "./walker"

interface TraverseContext {
    path: any[]
}

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

function traverseObject(fn: any, name: string, ctx: TraverseContext): Reflection | undefined {
    if (Array.isArray(fn)) return
    if (typeof fn === "object") {
        // CIRCULAR: return immediately
        if (ctx.path.some(x => x === fn)) return
        return reflectObject(fn, name, { path: ctx.path.concat(fn) })
    }
    if (typeof fn === "function" && metadata.isConstructor(fn))
        return reflectClass(fn)
    if (typeof fn === "function")
        return parseFunction(fn)
}

function reflectObject(object: any, name: string, ctx: TraverseContext): ObjectReflection {
    return {
        kind: "Object", name,
        members: Object.keys(object).map(x => traverseObject(object[x], x, ctx)).filter((x): x is Reflection => !!x)
    }
}

function reflectModuleOrClass(opt: string | Class) {
    if (typeof opt === "string") {
        return reflectObject(require(opt), "module", { path: [] })
    }
    else {
        return reflectClass(opt)
    }
}


// --------------------------------------------------------------------- //
// ------------------------------- CACHE ------------------------------- //
// --------------------------------------------------------------------- //

interface ReflectOption {
    /**
     * Flush cached current module/class metadata before processing. 
     */
    flushCache?: true
}

const cacheStore = new Map<string | Class, ClassReflection | ObjectReflection>()
const reflectCached = useCache(cacheStore, reflectModuleOrClass, x => x)

/**
 * Reflect module
 * @param path module name
 */
function reflect(path: string, opt?: Partial<ReflectOption>): ObjectReflection

/**
 * Reflect class
 * @param classType Class 
 */
function reflect(classType: Class, opt?: Partial<ReflectOption>): ClassReflection

function reflect(pathOrClass: string | Class, opt?: Partial<ReflectOption>): ClassReflection | ObjectReflection {
    if (opt?.flushCache)
        cacheStore.delete(pathOrClass)
    return reflectCached(pathOrClass)
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
 * Create class dynamically
 */
reflect.create = createClass

/**
 * Mark all constructor parameters as properties
 */
reflect.parameterProperties = parameterProperties

export { reflect }
