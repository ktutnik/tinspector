
/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

export const DecoratorOption = Symbol("tinspector:decoratorOption")
export const DecoratorId = Symbol("tinspector:decoratorId")

export type Class = new (...arg: any[]) => any
export type DecoratorIterator = (type: DecoratorTargetType, target: string, index?: number) => any[]
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property" | "Constructor"
export interface Decorator {
    targetType: DecoratorTargetType,
    target: string,
    value: any,
    inherit: boolean,
    allowMultiple: boolean
}
export interface ParamDecorator extends Decorator { 
    targetType: "Parameter", 
    targetIndex: number 
}

export type Reflection = ParameterReflection | FunctionReflection | PropertyReflection | MethodReflection | ClassReflection | ObjectReflection

export interface ReflectionBase {
    kind: string,
    name: string
}
export interface ParameterReflection extends ReflectionBase {
    kind: "Parameter",
    properties: string | { [key: string]: string[] },
    decorators: any[],
    type?: any,
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface PropertyReflection extends ReflectionBase {
    kind: "Property",
    decorators: any[],
    type?: any,
    get: any,
    set: any,
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface MethodReflection extends ReflectionBase {
    kind: "Method",
    parameters: ParameterReflection[],
    returnType: any,
    decorators: any[],
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface ConstructorReflection extends ReflectionBase {
    kind: "Constructor",
    parameters: ParameterReflection[]
}
export interface FunctionReflection extends ReflectionBase {
    kind: "Function",
    parameters: ParameterReflection[],
    returnType: any
}
export interface ClassReflection extends ReflectionBase {
    kind: "Class",
    ctor: ConstructorReflection,
    methods: MethodReflection[],
    properties: PropertyReflection[],
    decorators: any[],
    type: Class,
    super: Class,
    typeClassification?: "Class" | "Array" | "Primitive"
}
export interface ObjectReflection extends ReflectionBase {
    kind: "Object",
    members: Reflection[]
}
export interface ArrayDecorator {
    kind: "Array",
    type: Class
}
export interface TypeDecorator {
    kind: "Override",
    type: Class,
    info?: string
}
export interface PrivateDecorator {
    kind: "Ignore"
}
export interface DecoratorOption {
    inherit?: boolean,
    allowMultiple?: boolean
}

export type CustomPropertyDecorator = (target: Object, propertyKey: string | symbol, ...index: any[]) => void;

export const DECORATOR_KEY = "plumier.key:DECORATOR"
export const DESIGN_TYPE = "design:type"
export const DESIGN_PARAMETER_TYPE = "design:paramtypes"
export const DESIGN_RETURN_TYPE = "design:returntype"