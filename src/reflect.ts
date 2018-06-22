//version   1.1.0
//github    https://github.com/ktutnik/my-own-reflect


import * as Path from "path"
import "reflect-metadata"

/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

export type ReflectionType = "Object" | "Function" | "Parameter" | "Class" | "Method"
export interface Decorator { targetType: "Method" | "Class" | "Parameter", target: string, value: any }
export interface ParameterDecorator extends Decorator { targetType: "Parameter", targetIndex: number }
export interface Reflection { type: ReflectionType, name: string }
export interface ParameterReflection extends Reflection { type: "Parameter", decorators: any[] }
export interface FunctionReflection extends Reflection { type: "Function", parameters: ParameterReflection[], decorators: any[] }
export interface ClassReflection extends Reflection { type: "Class", file: string, methods: FunctionReflection[], decorators: any[] }
export interface ObjectReflection extends Reflection { type: "Object", file: string, members: Reflection[] }
export const DECORATOR_KEY = "plumier.key:DECORATOR"

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

//logic from https://github.com/goatslacker/get-parameter-names
function getParameterNames(fn: Function) {
    const code = fn.toString()
        //strive comments
        .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '')
        //strive lambda
        .replace(/=>.*$/mg, '')
        //strive default params
        .replace(/=[^,]+/mg, '');
    const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);
    return result === null ? [] : result;
}

function isConstructor(value: Function) {
    return value.toString().indexOf("class") == 0
}

function getType(object: any): ReflectionType {
    if (typeof object === "function") {
        if (isConstructor(object)) return "Class"
        else return "Function"
    }
    else return "Object"
}

export function decorateParameter(data: any) {
    return (target: any, name: string, index: number) => {
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target.constructor) || []
        decorators.push(<ParameterDecorator>{ targetType: "Parameter", target: name, targetIndex: index, value: data })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, target.constructor)
    }
}

export function decorateMethod(data: any) {
    return (target: any, name: string) => {
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target.constructor) || []
        decorators.push({ targetType: "Method", target: name, value: data })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, target.constructor)
    }
}

export function decorateClass(data: any) {
    return (target: any) => {
        const decorators: Decorator[] = Reflect.getMetadata(DECORATOR_KEY, target) || []
        decorators.push({ targetType: "Class", target: target.prototype.constructor.name, value: data })
        Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
    }
}

export function getDecorators(target: any): Decorator[] {
    return Reflect.getMetadata(DECORATOR_KEY, target) || []
}

/* ---------------------------------------------------------------- */
/* ------------------------- MAIN FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

function decorateReflection(decorators: Decorator[], reflection: ClassReflection) {
    const toParameter = (method: string, index: number, par: ParameterReflection) => ({
        ...par,
        decorators: (<ParameterDecorator[]>decorators)
            .filter((x) => x.targetType == "Parameter" && x.target == method && x.targetIndex == index)
            .map(x => ({ ...x.value }))
    })
    const toFunction = (fn: FunctionReflection) => ({
        ...fn,
        decorators: decorators.filter(x => x.targetType == "Method" && x.target == fn.name).map(x => ({ ...x.value })),
        parameters: fn.parameters.map((x, i) => toParameter(fn.name, i, x))
    })
    return <ClassReflection>{
        ...reflection,
        decorators: decorators.filter(x => x.targetType == "Class" && x.target == reflection.name).map(x => ({...x.value})),
        methods: reflection.methods.map(x => toFunction(x))
    }
}

function reflectParameter(name: string): ParameterReflection {
    return { type: "Parameter", name: name, decorators: [] }
}

function reflectFunction(fn: Function): FunctionReflection {
    return { type: "Function", name: fn.name, parameters: getParameterNames(fn).map(x => reflectParameter(x)), decorators: [] }
}

function reflectClass(fn: Function, file: string): ClassReflection {
    const methods = Object.getOwnPropertyNames(fn.prototype)
        .filter(x => x != "constructor")
        .map(x => <FunctionReflection>traverse(fn.prototype[x], x, file))
    const decorators = getDecorators(fn)
    return decorateReflection(decorators, { type: "Class", name: fn.name, methods, file, decorators: [] })
}

function reflectObject(object: any, path: string, name: string = "module"): ObjectReflection {
    return {
        type: "Object", name, file: path,
        members: Object.keys(object).map(x => traverse(object[x], x, path))
    }
}

function traverse(fn: any, name: string, file: string): Reflection {
    switch (getType(fn)) {
        case "Function":
            return reflectFunction(fn)
        case "Class":
            return reflectClass(fn, file)
        default:
            return reflectObject(fn, file, name)
    }
}

export async function reflect(path: string) {
    const object = await import(path);
    return reflectObject(object, path)
}