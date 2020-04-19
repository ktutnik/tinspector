import { noop } from "../src"
import { extendsClass } from "../src/purifier"
import { parseClass } from "../src/parser"

describe("Extends Class", () => {
    it("Should extends class", () => {
        class MyClass {
        }
        class OtherClass extends MyClass {
        }
        const result = extendsClass(parseClass(OtherClass))
        expect(result).toMatchSnapshot()
    })

    it("Should not extends constructor", () => {
        class MyClass {
            constructor(par1: number) { }
        }
        class OtherClass extends MyClass {
            constructor() { super(123) }
        }
        const result = extendsClass(parseClass(OtherClass))
        expect(result).toMatchSnapshot()
    })

    it("Should extends from multiple classes", () => {
        class GrandParent { }
        class MyClass extends GrandParent { }
        class OtherClass extends MyClass { }
        const result = extendsClass(parseClass(OtherClass))
        expect(result).toMatchSnapshot()
    })

    describe("Method", () => {
        it("Should extends parent method", () => {
            class MyClass {
                method(par1: string) { }
            }
            class OtherClass extends MyClass {
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
        it("Should add method", () => {
            class MyClass {
            }
            class OtherClass extends MyClass {
                method(par1: string) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
        it("Should extends overridden method", () => {
            class MyClass {
                method(par1: string) { }
            }
            class OtherClass extends MyClass {
                method(par1: string) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
        it("Should extends overridden method parameters", () => {
            class MyClass {
                method(par1: string, par2: number) { }
            }
            class OtherClass extends MyClass {
                method(par1: string) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
    })

    describe("Getter Setter", () => {
        it("Should extends parent getter setter", () => {
            class MyClass {
                get prop(): string { return "" }
                set prop(value: string) { }
            }
            class OtherClass extends MyClass {
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })

        it("Should get getter setter", () => {
            class MyClass {

            }
            class OtherClass extends MyClass {
                get prop(): string { return "" }
                set prop(value: string) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })

        it("Should extends overridden getter setter", () => {
            class MyClass {
                get prop(): string { return "" }
                set prop(value: string) { }
            }
            class OtherClass extends MyClass {
                get prop(): string { return "" }
                set prop(value: string) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
    })

    describe("Property Field", () => {
        it("Should extends parent property", () => {
            class MyClass {
                @noop()
                prop: string = "abc"
            }
            class OtherClass extends MyClass {
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
        it("Should add method", () => {
            class MyClass {
            }
            class OtherClass extends MyClass {
                @noop()
                prop: string = "abc"
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
        it("Should extends overridden method", () => {
            class MyClass {
                @noop()
                prop: string = "abc"
            }
            class OtherClass extends MyClass {
                @noop()
                prop: string = "efg"
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
    })

    describe("Parameter Property", () => {
        it("Should parse parameter properties", () => {
            class OtherClass {
                constructor(par1: string, par2: number) { }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })

        it("Should parse parent parameter properties", () => {
            class MyClass {
                constructor(par1: string, par2: number) { }
            }
            class OtherClass extends MyClass {
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })

        it("Should parse parent properties and child properties", () => {
            class MyClass {
                constructor(par1: string, par2: number) { }
            }
            class OtherClass extends MyClass {
                constructor(par3: string, par4: number) { super("", 123) }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })

        it("Should parse overridden parent properties", () => {
            class MyClass {
                constructor(par1: string) { }
            }
            class OtherClass extends MyClass {
                constructor(par1: string) { super("") }
            }
            const result = extendsClass(parseClass(OtherClass))
            expect(result).toMatchSnapshot()
        })
    })
})