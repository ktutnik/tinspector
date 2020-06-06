import "reflect-metadata"

import { metadata } from "./helpers"
import {
    Class,
    CustomPropertyDecorator,
    DECORATOR_KEY,
    DecoratorId,
    DecoratorOption,
    DecoratorTargetType,
    GenericTemplateDecorator,
    GenericTypeDecorator,
    NativeDecorator,
    NativeParameterDecorator,
    NoopDecorator,
    ParameterPropertiesDecorator,
    PrivateDecorator,
    TypeDecorator,
    TypeOverride,
    TypeOverrideOption,
} from "./types"

// --------------------------------------------------------------------- //
// ------------------------------- HELPER ------------------------------ //
// --------------------------------------------------------------------- //

function addDecorator<T extends NativeDecorator>(target: any, decorator: T) {
    const decorators: NativeDecorator[] = Reflect.getOwnMetadata(DECORATOR_KEY, target) || []
    decorators.push(decorator)
    Reflect.defineMetadata(DECORATOR_KEY, decorators, target)
}

/* ---------------------------------------------------------------- */
/* --------------------------- DECORATORS ------------------------- */
/* ---------------------------------------------------------------- */

export function decorateParameter(callback: ((target: Class, name: string, index: number) => any), option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator
export function decorateParameter(data: any, option?: DecoratorOption): ParameterDecorator {
    return decorate(data, ["Parameter"], option) as any
}

export function decorateMethod(callback: ((target: Class, name: string) => any), option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption): MethodDecorator
export function decorateMethod(data: any, option?: DecoratorOption) {
    return decorate(data, ["Method"], option)
}

export function decorateProperty(callback: ((target: Class, name: string, index?: any) => any), option?: DecoratorOption): CustomPropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption): CustomPropertyDecorator
export function decorateProperty(data: any, option?: DecoratorOption) {
    return decorate(data, ["Property", "Parameter"], option)
}

export function decorateClass(callback: ((target: Class) => any), option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption): ClassDecorator
export function decorateClass(data: any, option?: DecoratorOption) {
    return decorate(data, ["Class"], option)
}

export function decorate(data: any | ((...args: any[]) => any), targetTypes: DecoratorTargetType[] = [], option?: Partial<DecoratorOption>) {
    const throwIfNotOfType = (target: DecoratorTargetType) => {
        if (targetTypes.length > 0 && !targetTypes.some(x => x === target))
            throw new Error(`Reflect Error: Decorator of type ${targetTypes.join(", ")} applied into ${target}`)
    }
    const opt: Required<DecoratorOption> = { allowMultiple: true, inherit: true, ...option }
    return (...args: any[]) => {
        const theData = typeof data === "function" ? data(...args) : data
        if (!opt.allowMultiple && !theData[DecoratorId]) {
            const ctorName = metadata.isConstructor(args[0]) ? args[0].name : args[0].constructor.name
            throw new Error(`Reflect Error: Decorator with allowMultiple set to false must have DecoratorId property in ${ctorName}`)
        }
        //class decorator
        if (args.length === 1) {
            throwIfNotOfType("Class")
            return addDecorator(args[0], {
                targetType: "Class",
                target: args[0].name,
                value: typeof data === "function" ? data(args[0]) : data,
                ...opt
            })
        }
        //parameter decorator
        if (args.length === 3 && typeof args[2] === "number") {
            throwIfNotOfType("Parameter")
            const isCtorParam = metadata.isConstructor(args[0])
            const targetType = isCtorParam ? args[0] : args[0].constructor
            const targetName = isCtorParam ? "constructor" : args[1]
            return addDecorator<NativeParameterDecorator>(targetType, {
                targetType: "Parameter",
                target: targetName,
                targetIndex: args[2],
                value: typeof data === "function" ? data(targetType, targetName, args[2]) : data,
                ...opt
            })
        }
        //property
        if (args[2] === undefined || args[2].get || args[2].set) {
            throwIfNotOfType("Property")
            return addDecorator(args[0].constructor, {
                targetType: "Property",
                target: args[1],
                value: typeof data === "function" ? data(args[0].constructor, args[1]) : data,
                ...opt
            })
        }
        throwIfNotOfType("Method")
        return addDecorator(args[0].constructor, {
            targetType: "Method",
            target: args[1],
            value: typeof data === "function" ? data(args[0].constructor, args[1]) : data,
            ...opt
        })
    }
}

export function mergeDecorator(...fn: (ClassDecorator | PropertyDecorator | NativeParameterDecorator | MethodDecorator)[]) {
    return (...args: any[]) => {
        fn.forEach(x => (x as Function)(...args))
    }
}


const symIgnore = Symbol("ignore")
const symOverride = Symbol("override")
const symArray = Symbol("array")
const symParamProp = Symbol("paramProp")
const symNoop = Symbol("noop")

export function ignore() {
    return decorate(<PrivateDecorator>{ [DecoratorId]: symIgnore, kind: "Ignore" }, ["Parameter", "Method", "Property"], { allowMultiple: false })
}

export function type(type: TypeOverride | ((x: any) => TypeOverride), ...genericParams: (string | string[])[]) {
    // type is not inheritable because derived class can define their own type override
    return decorate((target: any) => <TypeDecorator>{ [DecoratorId]: symOverride, kind: "Override", type, genericParams, target }, ["Parameter", "Method", "Property"], { inherit: false, allowMultiple: false })
}

export function noop() {
    // type is not inheritable because derived class can define their own type override
    return decorate((target: any) => <NoopDecorator>{ [DecoratorId]: symNoop, kind: "Noop", target }, undefined, { inherit: false, allowMultiple: false })
}

export function parameterProperties() {
    return decorateClass(<ParameterPropertiesDecorator>{ [DecoratorId]: symParamProp, type: "ParameterProperties" }, { allowMultiple: false })
}

export namespace generic {
    const symGenericType = Symbol("genericType")
    const symGenericTemplate = Symbol("genericTemplate")
    export function template(...templates: string[]) {
        return decorateClass(target => <GenericTemplateDecorator>{ [DecoratorId]: symGenericTemplate, kind: "GenericTemplate", templates, target }, { inherit: false, allowMultiple: false })
    }
    export function type(...types: TypeOverride[]) {
        return decorateClass(target => <GenericTypeDecorator>{ [DecoratorId]: symGenericType, kind: "GenericType", types, target }, { inherit: false, allowMultiple: false })
    }
    /**
     * Create generic class dynamically
     * @param parent Super class that the class inherited from
     * @param params List of generic type parameters
     */
    export function create<T extends Class>(parent: T | { parent: T, name: string }, ...params: TypeOverride[]) {
        const opt = (typeof parent === "object") ? parent : { parent: parent, name: "DynamicType" }
        const Type = metadata.createClass(opt.parent, opt.name)
        Reflect.decorate([generic.type(...params)], Type)
        return Type
    }
}
