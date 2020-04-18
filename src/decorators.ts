import "reflect-metadata"
import { Class, DecoratorOption, DecoratorTargetType, DecoratorId, ParamDecorator, CustomPropertyDecorator } from "./types"
import { isConstructor, addDecorator } from "./helpers"

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
            const ctorName = isConstructor(args[0]) ? args[0].name : args[0].constructor.name
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
            const isCtorParam = isConstructor(args[0])
            const targetType = isCtorParam ? args[0] : args[0].constructor
            const targetName = isCtorParam ? "constructor" : args[1]
            return addDecorator<ParamDecorator>(targetType, {
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

export function mergeDecorator(...fn: (ClassDecorator | PropertyDecorator | ParamDecorator | MethodDecorator)[]) {
    return (...args: any[]) => {
        fn.forEach(x => (x as Function)(...args))
    }
}