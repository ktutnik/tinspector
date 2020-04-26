import { createVisitors, visitors, purifyTraversal } from "../src/purifier"
import { noop, type, decorateClass, decorateMethod, decorateProperty, decorateParameter, array, parameterProperties, ignore, DecoratorId, generic } from "../src"
import { parseClass } from "../src/parser"



describe("Purifier", () => {
    describe("Inheritance", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta)
        it("Should able to add inheritance info", () => {
            class SuperClass { }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add methods inheritance info", () => {
            class SuperClass {
                method(par: string) { }
            }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Design Type Information", () => {
        const visitor = createVisitors(visitors.addsDesignTypes)
        it("Should able to add method parameter type", () => {
            class MyClass {
                @noop()
                method(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add method return type", () => {
            class MyClass {
                @noop()
                method(): number { return 20 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add constructor parameter type", () => {
            @noop()
            class MyClass {
                constructor(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add getter setter type", () => {
            class MyClass {
                @noop()
                get getter(): number { return 1 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add field property type", () => {
            class MyClass {
                @noop()
                prop: number = 124
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Design Type Information and Inheritance", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDesignTypes)
        it("Should able to add inherited method parameter type", () => {
            class SuperClass {
                @noop()
                method(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add overridden method parameter type", () => {
            class SuperClass {
                @noop()
                method(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            class MyClass extends SuperClass {
                method(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add inherited method return type", () => {
            class SuperClass {
                @noop()
                method(): number { return 20 }
            }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add overridden method return type", () => {
            class SuperClass {
                @noop()
                method(): number { return 20 }
            }
            class MyClass extends SuperClass {
                method(): number { return 2000 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should not inherit constructor parameter type", () => {
            @noop()
            class SuperClass {
                constructor(par1: string, par2: number, par3: boolean, par4: Date) { }
            }
            @noop()
            class MyClass extends SuperClass {
                constructor(dif1: string, dif2: number) { super("", 1, false, new Date()) }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add inherited getter setter type", () => {
            class SuperClass {
                @noop()
                get getter(): number { return 1 }
            }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add overridden getter setter type", () => {
            class SuperClass {
                @noop()
                get getter(): number { return 1 }
            }
            class MyClass extends SuperClass {
                get getter(): number { return 1 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add inherited field property type", () => {
            class SuperClass {
                @noop()
                prop: number = 124
            }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add overridden field property type", () => {
            class SuperClass {
                @noop()
                prop: number = 124
            }
            class MyClass extends SuperClass {
                @noop()
                prop: number = 456
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Decorators", () => {
        const visitor = createVisitors(visitors.addsDecorators)
        it("Should able to add class decorator", () => {
            @decorateClass({ cache: 10 })
            @decorateClass({ timeout: 10 })
            class MyClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to add method decorator", () => {
            class MyClass {
                @decorateMethod({ cache: 10 })
                @decorateMethod({ timeout: 10 })
                method() { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to add property decorator", () => {
            class MyClass {
                @decorateProperty({ cache: 10 })
                @decorateProperty({ timeout: 10 })
                prop: number = 123
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to add getter decorator", () => {
            class MyClass {
                @decorateProperty({ cache: 10 })
                @decorateProperty({ timeout: 10 })
                get prop(): number { return 123 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to add parameter decorator on method", () => {
            class MyClass {
                method(@decorateParameter({ cache: 10 }) @decorateParameter({ timeout: 10 }) par1: string) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to add decorator on constructor parameter", () => {
            class MyClass {
                constructor(@decorateParameter({ cache: 10 }) @decorateParameter({ timeout: 10 }) par1: string) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Decorators and Inheritance", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDecorators)
        it("Should able to add class decorator", () => {
            @decorateClass({ cache: 10 })
            @decorateClass({ timeout: 10 })
            class SuperClass {
            }
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to skip decorator inheritance in class", () => {
            @decorateClass({ timeout: 10 }, { inherit: false })
            class SuperClass {
            }
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to skip decorator inheritance in members", () => {
            class SuperClass {
                @decorateMethod({ timeout: 10 }, { inherit: false })
                method() { return 1 }
            }
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to skip decorator inheritance in deep inheritance", () => {
            class GrandSuperClass {
                @decorateMethod({ timeout: 10 }, { inherit: false })
                method() { return 1 }
            }
            class SuperClass extends GrandSuperClass { }
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to merge multiple decorator when specified on class", () => {
            @decorateClass({ [DecoratorId]: "id", timeout: 10 }, { allowMultiple: false })
            class SuperClass {
            }
            @decorateClass({ [DecoratorId]: "id", timeout: 11 }, { allowMultiple: false })
            class MyClass extends SuperClass {
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to merge multiple decorator when specified on member", () => {
            class SuperClass {
                @decorateMethod({ [DecoratorId]: "id", timeout: 10 }, { allowMultiple: false })
                method() { }
            }
            class MyClass extends SuperClass {
                @decorateMethod({ [DecoratorId]: "id", timeout: 11 }, { allowMultiple: false })
                method() { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Type Overridden", () => {
        const visitor = createVisitors(visitors.addsDesignTypes, visitors.addsDecorators, visitors.addsTypeOverridden)
        it("Should able to override method return type", () => {
            class MyClass {
                @type(Number)
                async method(): Promise<number> { return 1 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override method return type of array type", () => {
            class MyClass {
                @type([Number])
                async method(): Promise<number[]> { return [1] }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override array type using @array", () => {
            class MyClass {
                @array(Number)
                async method(): Promise<number[]> { return [1] }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override method parameter type", () => {
            class MyClass {
                method(@type([Number]) nums: number[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override method parameter type with custom type", () => {
            class CustomType { }
            class MyClass {
                method(@type([CustomType]) nums: CustomType[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override method parameter type with custom type with @array", () => {
            class CustomType { }
            class MyClass {
                method(@array(CustomType) nums: CustomType[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override constructor parameter type", () => {
            class MyClass {
                constructor(@type([Number]) nums: number[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override constructor parameter type with custom type", () => {
            class CustomType { }
            class MyClass {
                constructor(@type([CustomType]) nums: CustomType[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override constructor parameter type with custom type with @array", () => {
            class CustomType { }
            class MyClass {
                constructor(@array(CustomType) nums: CustomType[]) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Parameter Properties", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDesignTypes, visitors.addsDecorators, visitors.addsParameterProperties)
        it("Should add parameter properties", () => {
            @parameterProperties()
            class MyClass {
                constructor(public par1: string, public par2: number, public par3: boolean, public par4: Date) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should not add parameter properties if not specified", () => {
            class MyClass {
                constructor(public par1: string, public par2: number, public par3: boolean, public par4: Date) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to inherit parameter properties", () => {
            @parameterProperties()
            class SuperClass {
                constructor(public par1: string, public par2: number) { }
            }
            class MyClass extends SuperClass {
                constructor() {
                    super("", 123)
                }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override parameter properties", () => {
            @parameterProperties()
            class SuperClass {
                constructor(public par1: string, public par2: number) { }
            }
            @parameterProperties()
            class MyClass extends SuperClass {
                constructor(public par1: string, public par2: number) {
                    super(par1, par2)
                }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to override parameter properties in different order", () => {
            @parameterProperties()
            class SuperClass {
                constructor(public par1: string, public par2: number) { }
            }
            @parameterProperties()
            class MyClass extends SuperClass {
                constructor(public par2: number, public par1: string) {
                    super(par1, par2)
                }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })

        it("Should able to override any parameter properties", () => {
            @parameterProperties()
            class SuperClass {
                constructor(public par1: string, public par2: number) { }
            }
            @parameterProperties()
            class MyClass extends SuperClass {
                constructor(public par2: number) {
                    super("", par2)
                }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Ignore Member", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDecorators, visitors.removeIgnored)
        it("Should able to ignore method", () => {
            class MyClass {
                method() { }
                @ignore()
                ignored() { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to ignore inherited method", () => {
            class SuperClass {
                method() { }
                @ignore()
                ignored() { }
            }
            class MyClass extends SuperClass { }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to ignore property", () => {
            class MyClass {
                @noop()
                prop: number = 20
                @ignore()
                ignored: number = 30
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to ignore getter", () => {
            class MyClass {
                @noop()
                get prop(): number { return 20 }
                @ignore()
                get ignored(): number { return 30 }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to ignore parameter properties", () => {
            @parameterProperties()
            class MyClass {
                constructor(public par1: number, @ignore() public ignored: number) { }
            }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Generic Type", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDesignTypes, visitors.addsDecorators, visitors.addsTypeOverridden, visitors.addsGenericOverridden)
        it("Should able to add generic information", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            @generic.type(String)
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add generic information on nested class", () => {
            @generic.template("T")
            class GrandSuperClass<T>{
                @type("T")
                str(): T { return {} as any }
            }
            @generic.template("T")
            @generic.type(String)
            class SuperClass<T> extends GrandSuperClass<string>{
                @type("T")
                num(): T { return {} as any }
            }
            @generic.type(Number)
            class MyClass extends SuperClass<number>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add generic information on nested class with multiple templates", () => {
            @generic.template("T", "U")
            class GrandSuperClass<T, U>{
                @type("T")
                str(@type("U") par:U): T { return {} as any }
            }
            @generic.template("T", "U")
            @generic.type(String, Number)
            class SuperClass<T, U> extends GrandSuperClass<string, number>{
                @type("T")
                num(@type("U") par:U): T { return {} as any }
            }
            @generic.type(Number, Number)
            class MyClass extends SuperClass<number, number>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add generic array information", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type(["T"])
                method(): T[] { return {} as any }
            }
            @generic.type(String)
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add generic info on method parameter", () => {
            @generic.template("T")
            class SuperClass<T> {
                method(@type("T") par1:T) {  }
            }
            @generic.type(String)
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
        it("Should able to add generic info on property", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type("T")
                prop:T = {} as any 
            }
            @generic.type(String)
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            const result = purifyTraversal(meta, { parent: meta, visitor, target: meta.type })
            expect(result).toMatchSnapshot()
        })
    })

    describe("Generic Error Message", () => {
        const visitor = createVisitors(visitors.addSuperclassMeta, visitors.addsDesignTypes, visitors.addsDecorators, visitors.addsTypeOverridden, visitors.addsGenericOverridden)
        it("Should throw error when @generic.type defined but @generic.template doesn't", () => {
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            @generic.type(String)
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            expect(() =>  purifyTraversal(meta, { parent: meta, visitor, target: meta.type })).toThrowErrorMatchingSnapshot()
        })
        it("Should throw error when @generic.template defined but @generic.type doesn't", () => {
            @generic.template("T")
            class SuperClass<T> {
                @type("T")
                method(): T { return {} as any }
            }
            class MyClass extends SuperClass<string>{ }
            const meta = parseClass(MyClass)
            expect(() =>  purifyTraversal(meta, { parent: meta, visitor, target: meta.type })).toThrowErrorMatchingSnapshot()
        })
        it("Should throw error when number of parameter on generic type not specified", () => {
            @generic.template("T", "U")
            class SuperClass<T, U> {
                @type("T")
                method(@type("U") par:U): T { return {} as any }
            }
            @generic.type(String)
            class MyClass extends SuperClass<string, number>{ }
            const meta = parseClass(MyClass)
            expect(() =>  purifyTraversal(meta, { parent: meta, visitor, target: meta.type })).toThrowErrorMatchingSnapshot()
        })
        it("Should throw error when number of parameter on generic template not specified", () => {
            @generic.template("T")
            class SuperClass<T, U> {
                @type("T")
                method(@type("U") par:U): T { return {} as any }
            }
            @generic.type(String, Number)
            class MyClass extends SuperClass<string, number>{ }
            const meta = parseClass(MyClass)
            expect(() =>  purifyTraversal(meta, { parent: meta, visitor, target: meta.type })).toThrowErrorMatchingSnapshot()
        })
    })
})