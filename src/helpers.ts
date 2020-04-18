import { Node, parse } from "acorn"
import { ArrayDecorator, Class, Decorator, DECORATOR_KEY, TypeDecorator } from "./types"


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

    export function getClassMembers(fun: Function) {
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

    export function getType(decorators: any[], type: any) {
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
