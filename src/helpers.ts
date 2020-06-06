

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

import { Class, ParameterPropertyReflection, ClassReflection } from "./types"

function useCache<K, P extends any[], R>(cache: Map<K, R>, fn: (...args: P) => R, getKey: (...args: P) => K) {
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

namespace metadata {
    export function createClass(parent: Class, name: string): Class {
        return { [name]: class extends parent { } }[name];
    }

    export function isParameterProperties(meta: any): meta is ParameterPropertyReflection {
        return meta && meta.kind === "Property" && (meta as ParameterPropertyReflection).isParameter
    }

    export function isCallback(type: any): type is ((x: any) => Class[] | Class | string | string[]) {
        return typeof type === "function" && !type.prototype
    }

    export function isConstructor(value: any) {
        return ("" + value).indexOf("class") == 0
    }

    export function isCustomClass(type: Function | Function[]) {
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

    export function getMethods(meta: ClassReflection) {
        return meta.methods.map(x => ({
            name: x.name,
            type: x.returnType,
            pars: x.parameters
                .map(p => ({ name: p.name, type: p.type }))
        }))
    }

    export function getProperties(meta: ClassReflection) {
        return meta.properties.map(x => ({
            name: x.name,
            type: x.type
        }))
    }
}



export { useCache, metadata }
