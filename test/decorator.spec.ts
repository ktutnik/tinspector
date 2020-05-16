import {
    decorate,
    decorateClass,
    decorateMethod,
    decorateParameter,
    decorateProperty,
    reflect,
    mergeDecorator,
    noop,
    type,
    generic,
} from "../src"

describe("Decorator", () => {
    it("Should decorate class, properties and parameter", () => {
        @decorate({})
        class DummyClass {
            @decorate({})
            myProp = 1;
            @decorate({})
            myFunction(
                @decorate({}) par: string
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate class", () => {
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate class multiple", () => {
        @decorateClass({ otherInfo: "Some Other Info" })
        @decorateClass({ info: "Some Info" })
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate class using callback", () => {
        @decorateClass(x => ({ name: x.name }))
        class DummyClass { }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method", () => {
        class DummyClass {
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method multiple", () => {
        class DummyClass {
            @decorateMethod({ otherInfo: "Some Other Info" })
            @decorateMethod({ info: "Some Info" })
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should decorate method with callback", () => {
        class DummyClass {
            @decorateMethod((a, b) => ({ target: a.name, method: b }))
            method() { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter", () => {
        class DummyClass {
            method(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter multiple", () => {
        class DummyClass {
            method(
                @decorateParameter({ otherInfo: "Some Other Info" })
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate method parameter with callback", () => {
        class DummyClass {
            method(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter multiple", () => {
        class DummyClass {
            constructor(
                @decorateParameter({ otherInfo: "Some Other Info" })
                @decorateParameter({ info: "Some Info" })
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to decorate constructor parameter", () => {
        class DummyClass {
            constructor(
                @decorateParameter((a, b, c) => ({ target: a.name, name: b, index: c }))
                id: number
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties", () => {
        class DummyClass {
            @decorateProperty({})
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties multiple", () => {
        class DummyClass {
            @decorateProperty({ value: 1 })
            @decorateProperty({ value: 2 })
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties with callback", () => {
        class DummyClass {
            @decorateProperty((target, name, index) => ({ target, name, index }))
            dummyProp: string = "Hello"
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with properties with callback in constructor", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(
                @decorateProperty((target, name, index) => ({ target, name, index }))
                dummyProp: string
            ) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set", () => {
        class DummyClass {
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator", () => {
        class DummyClass {
            @decorateProperty({})
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator multiple", () => {
        class DummyClass {
            @decorateProperty({ value: 1 })
            @decorateProperty({ value: 2 })
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect class with get set with decorator callback", () => {
        class DummyClass {
            @decorateProperty((target, name) => ({ target, name }))
            get data() { return 1 }
            set data(value: number) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(@decorateProperty({}) public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator multiple", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(
                @decorateProperty({ value: 1 })
                @decorateProperty({ value: 2 })
                public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should inspect constructor property with decorator callback", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(
                @decorateProperty((target, name) => ({ target, name }))
                public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should not inspect private constructor property", () => {
        @reflect.parameterProperties()
        class DummyClass {
            constructor(public data: string, @reflect.ignore() myPrivateField: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    it("Should able to merge decorator", () => {
        function cacheAndProps() {
            return mergeDecorator(
                decorateClass({ type: "Cache" }),
                reflect.parameterProperties())
        }
        @cacheAndProps()
        class DummyClass {
            constructor(public data: string) { }
        }
        const meta = reflect(DummyClass)
        expect(meta).toMatchSnapshot()
    })

    describe("Error Handling", () => {
        const DecoratorIdError = 'Reflect Error: Decorator with allowMultiple set to false must have DecoratorId property in DummyClass'
        function error(callback: () => void) {
            const fn = jest.fn()
            try {
                callback()
            }
            catch (e) {
                fn(e)
            }
            return fn.mock.calls[0][0]
        }

        it("Should throw when method decorator applied on wrong location", () => {
            const err = error(() => {
                @decorate({}, ["Method", "Parameter"])
                class DummyClass { }
            })
            expect(err.message).toBe('Reflect Error: Decorator of type Method, Parameter applied into Class')
        })

        it("Should throw when method decorator applied on wrong location", () => {
            const err = error(() => {
                class DummyClass {
                    @decorate({}, ["Method"])
                    myProp = 200
                }
            })
            expect(err.message).toBe('Reflect Error: Decorator of type Method applied into Property')
        })

        it("Should throw when method decorator applied on wrong location", () => {
            const err = error(() => {
                class DummyClass {
                    @decorate({}, ["Property"])
                    myFunction() { }
                }
            })
            expect(err.message).toBe('Reflect Error: Decorator of type Property applied into Method')
        })

        it("Should throw when method decorator applied on wrong location", () => {
            const err = error(() => {
                class DummyClass {
                    constructor(@decorate({}, ["Property"]) param: string) { }
                }
            })
            expect(err.message).toBe('Reflect Error: Decorator of type Property applied into Parameter')
        })

        it("Should throw when allowMultiple false but without DecoratorId on class level", () => {
            const err = error(() => {
                @decorateClass({ hello: "world" }, { allowMultiple: false })
                class DummyClass { }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on class level with hook", () => {
            const err = error(() => {
                @decorateClass(target => ({ hello: "world" }), { allowMultiple: false })
                class DummyClass { }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on method level", () => {
            const err = error(() => {
                class DummyClass {
                    @decorateMethod({ hello: "world" }, { allowMultiple: false })
                    dummy() { }
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on method level with hook", () => {
            const err = error(() => {
                class DummyClass {
                    @decorateMethod(target => ({ hello: "world" }), { allowMultiple: false })
                    dummy() { }
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on parameter level", () => {
            const err = error(() => {
                class DummyClass {
                    dummy(@decorateParameter({ hello: "world" }, { allowMultiple: false }) a: number) { }
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on parameter level with hook", () => {
            const err = error(() => {
                class DummyClass {
                    dummy(@decorateParameter(target => ({ hello: "world" }), { allowMultiple: false }) a: number) { }
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on property level", () => {
            const err = error(() => {
                class DummyClass {
                    @decorateProperty({ hello: "world" }, { allowMultiple: false })
                    myProp: number = 1
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })

        it("Should throw when allowMultiple false but without DecoratorId on property level with hook", () => {
            const err = error(() => {
                class DummyClass {
                    @decorateProperty(target => ({ hello: "world" }), { allowMultiple: false })
                    myProp: number = 1
                }
            })
            expect(err.message).toBe(DecoratorIdError)
        })
    })

    describe("Type Override", () => {
        describe("noop", () => {
            it("Should able to override method return type with @noop()", () => {
                class MyClass {
                    @noop(x => Number)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override array type with @noop()", () => {
                class MyClass {
                    @noop(x => [Number])
                    arr: Number[] = [1]
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should not cause cross reference error on circular dependency", () => {
                class OtherClass {
                    @noop(x => [MyClass])
                    my: MyClass[] = []
                }
                class MyClass {
                    @noop(x => [OtherClass])
                    other: OtherClass[] = []
                }
                expect(reflect(MyClass)).toMatchSnapshot()
                expect(reflect(OtherClass)).toMatchSnapshot()
            })

            it("Should not cause issue when decorated with @noop()", () => {
                class MyClass {
                    @noop()
                    data: number = 123
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to mark generic type with @noop()", () => {

                @generic.template("T")
                class MyOtherClass<T> {
                    @noop(x => "T")
                    data: T = {} as any
                }

                @generic.type(Number)
                class MyClass extends MyOtherClass<Number> { }
                expect(reflect(MyClass)).toMatchSnapshot()
            })
        })
        describe("type", () => {
            it("Should able to override method return type with @type() of type Number", () => {
                class MyClass {
                    @type(Number)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() of type Boolean", () => {
                class MyClass {
                    @type(Boolean)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() of type Date", () => {
                class MyClass {
                    @type(Date)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() of type Array", () => {
                class MyClass {
                    @type(Array)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() of type Promise", () => {
                class MyClass {
                    @type(Promise)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })


            it("Should able to override method return type with @type() of type String", () => {
                class MyClass {
                    @type(String)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() of type Object", () => {
                class MyClass {
                    @type(Object)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override method return type with @type() with callback", () => {
                class MyClass {
                    @type(x => Object)
                    myMethod() { }
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should able to override array type with @type()", () => {
                class MyClass {
                    @type(x => [Number])
                    arr: Number[] = [1]
                }
                expect(reflect(MyClass)).toMatchSnapshot()
            })

            it("Should not cause cross reference error on circular dependency", () => {
                class OtherClass {
                    @type(x => [MyClass])
                    my: MyClass[] = []
                }
                class MyClass {
                    @type(x => [OtherClass])
                    other: OtherClass[] = []
                }
                expect(reflect(MyClass)).toMatchSnapshot()
                expect(reflect(OtherClass)).toMatchSnapshot()
            })

            it("Should able to mark generic type with @type()", () => {
                @generic.template("T")
                class MyOtherClass<T> {
                    @type(x => "T")
                    data: T = {} as any
                }

                @generic.type(Number)
                class MyClass extends MyOtherClass<Number> { }
                expect(reflect(MyClass)).toMatchSnapshot()
            })
        })
    })
})