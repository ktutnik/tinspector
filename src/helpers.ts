

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

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
    export function isConstructor(value: Function) {
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
}



export { useCache, metadata }