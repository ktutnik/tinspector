
/* ---------------------------------------------------------------- */
/* --------------------------- TYPES ------------------------------ */
/* ---------------------------------------------------------------- */

export const DecoratorOptionId = Symbol("tinspector:decoratorOption")
export const DecoratorId = Symbol("tinspector:decoratorId")

export type Class<T = any> = new (...arg: any[]) => T
export type DecoratorIterator = (type: DecoratorTargetType, target: string, index?: number) => any[]
export type DecoratorTargetType = "Method" | "Class" | "Parameter" | "Property"
export interface NativeDecorator {
    targetType: DecoratorTargetType,
    target: string,
    value: any,
    inherit: boolean,
    allowMultiple: boolean
}
export interface NativeParameterDecorator extends NativeDecorator {
    targetType: "Parameter",
    targetIndex: number
}

export type Reflection = ParameterReflection | FunctionReflection | PropertyReflection | MethodReflection | ClassReflection | ObjectReflection | ConstructorReflection
export type WithOwnerReflection = MethodReflection | PropertyReflection | ParameterReflection
export type TypedReflection = ClassReflection | MethodReflection | PropertyReflection | ParameterReflection | ConstructorReflection | ParameterPropertyReflection

export interface ReflectionBase {
    kind: string,
    name: string
}
export interface ParameterReflection extends ReflectionBase {
    kind: "Parameter",
    fields: string | { [key: string]: string[] },
    decorators: any[],
    type?: any,
    typeClassification?: "Class" | "Array" | "Primitive"
    owner: Class[],
    index: number
}
export interface PropertyReflection extends ReflectionBase {
    kind: "Property",
    decorators: any[],
    type?: any,
    get?: any,
    set?: any,
    typeClassification?: "Class" | "Array" | "Primitive"
    owner: Class[], 
}
export interface ParameterPropertyReflection extends PropertyReflection {
    index:number,
    isParameter:boolean
}
export interface MethodReflection extends ReflectionBase {
    kind: "Method",
    parameters: ParameterReflection[],
    returnType: any,
    decorators: any[],
    typeClassification?: "Class" | "Array" | "Primitive"
    owner: Class[]
}
export interface ConstructorReflection extends ReflectionBase {
    kind: "Constructor",
    parameters: ParameterReflection[],
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
    typeClassification?: "Class" | "Array" | "Primitive",
    owner: Class[]
}
export interface ObjectReflection extends ReflectionBase {
    kind: "Object",
    members: Reflection[]
}
export interface ArrayDecorator {
    kind: "Array",
    type: Class | string
}
export interface TypeDecorator {
    kind: "Override",
    type: Class[] | Class | string | string[],
    info?: string,
    target: Class
}
export interface PrivateDecorator {
    kind: "Ignore"
}
export interface ParameterPropertiesDecorator {
    type: "ParameterProperties"
}
export interface GenericTypeDecorator {
    kind: "GenericType",
    types: (Class|Class[])[]
    target:Class
}
export interface GenericTemplateDecorator {
    kind: "GenericTemplate",
    templates: string[]
    target:Class
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