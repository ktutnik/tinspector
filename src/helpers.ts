import { parse, Node } from "acorn"
import { Class, DECORATOR_KEY, Decorator, DecoratorIterator, DecoratorTargetType, ParamDecorator, DecoratorOption, ArrayDecorator, TypeDecorator, PrivateDecorator } from "./types"
/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */



function isConstructor(value: Function) {
    return ("" + value).indexOf("class") == 0
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



function addDecorator<T extends Decorator>(target: any, decorator: T) {
    const decorators: Decorator[] = Reflect.getOwnMetadata(DECORATOR_KEY, target) || []
    decorators.push(decorator)
    Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
}



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



export { isConstructor, addDecorator, isCustomClass, useCache }