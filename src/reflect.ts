//version   1.0.0
//github    https://github.com/ktutnik/my-own-reflect


import * as Path from "path"

/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

export type ReflectionType = "Object" | "Function" | "Parameter" | "Class" | "Method"
export interface Reflection { type: ReflectionType, name: string }
export interface ParameterReflection extends Reflection { type: "Parameter" }
export interface FunctionReflection extends Reflection { type: "Function", parameters?: ParameterReflection[] }
export interface ClassReflection extends Reflection { type: "Class", methods?: FunctionReflection[] }
export interface ObjectReflection extends Reflection { type: "Object", members?: Reflection[] }

/* ---------------------------------------------------------------- */
/* --------------------------- HELPERS ---------------------------- */
/* ---------------------------------------------------------------- */

//logic from https://github.com/goatslacker/get-parameter-names
function getParameterNames(fn: Function) {
    const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const DEFAULT_PARAMS = /=[^,]+/mg;
    const FAT_ARROWS = /=>.*$/mg;
    const code = fn.toString()
        .replace(COMMENTS, '')
        .replace(FAT_ARROWS, '')
        .replace(DEFAULT_PARAMS, '');
    const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
        .match(/([^\s,]+)/g);
    return result === null ? [] : result;
}

function isConstructor(value: Function) {
    return value.toString().indexOf("class") == 0
}


/* ---------------------------------------------------------------- */
/* ------------------------- MAIN FUNCTIONS ----------------------- */
/* ---------------------------------------------------------------- */

function getType(object: any): ReflectionType {
    if (typeof object === "function") {
        if (isConstructor(object)) return "Class"
        else return "Function"
    }
    else return "Object"
}

function reflectParameter(name: string): ParameterReflection {
    return { type: "Parameter", name: name }
}

function reflectFunction(fn: Function): FunctionReflection {
    return { type: "Function", name: fn.name, parameters: getParameterNames(fn).map(x => reflectParameter(x)) }
}

function reflectClass(fn: Function): ClassReflection {
    const methods = Object.getOwnPropertyNames(fn.prototype)
        .filter(x => x != "constructor")
        .map(x => <FunctionReflection>traverse(fn.prototype[x], x))
    return { type: "Class", name: fn.name, methods }
}

function reflectObject(object: any, name: string = "module"): ObjectReflection {
    return {
        type: "Object", name,
        members: Object.keys(object).map(x => traverse(object[x], x))
    }
}

function traverse(fn: any, name: string): Reflection {
    switch (getType(fn)) {
        case "Function":
            return reflectFunction(fn)
        case "Class":
            return reflectClass(fn)
        default:
            return reflectObject(fn, name)
    }
}

export async function reflect(path: string) {
    const importPath = ["./", "../", "/"].some(x => path.indexOf(x) == 0) ?
        Path.join(Path.dirname(module.parent!.filename), path) :
        path
    const object = await import(importPath);
    return reflectObject(object)
}