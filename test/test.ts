import { reflect } from "../src/reflect";
import * as Utils from "util"

describe("Reflect", () => {
    test("Should reflect module properly", async () => {
        const result = await reflect("./mocks")
        expect(result).toEqual({
            type: 'Object',
            name: 'module',
            members:
                [{
                    type: 'Function',
                    name: 'myFun',
                    parameters:
                        [{ type: 'Parameter', name: 'firstPar' },
                        { type: 'Parameter', name: 'secondPar' }]
                },
                { type: 'Function', name: 'myOtherFun', parameters: [] },
                {
                    type: 'Class',
                    name: 'MyClass',
                    methods:
                        [{
                            type: 'Function',
                            name: 'myMethod',
                            parameters:
                                [{ type: 'Parameter', name: 'firstPar' },
                                { type: 'Parameter', name: 'secondPar' }]
                        },
                        { type: 'Function', name: 'myOtherMethod', parameters: [] }]
                },
                {
                    type: 'Object',
                    name: 'myNamespace',
                    members:
                        [{
                            type: 'Function',
                            name: 'myFunInsideNamespace',
                            parameters:
                                [{ type: 'Parameter', name: 'firstPar' },
                                { type: 'Parameter', name: 'secondPar' }]
                        },
                        {
                            type: 'Function',
                            name: 'myOtherFunInsideNamespace',
                            parameters: []
                        },
                        {
                            type: 'Class',
                            name: 'MyClassInsideNamespace',
                            methods:
                                [{
                                    type: 'Function',
                                    name: 'myMethod',
                                    parameters:
                                        [{ type: 'Parameter', name: 'firstPar' },
                                        { type: 'Parameter', name: 'secondPar' }]
                                },
                                { type: 'Function', name: 'myOtherMethod', parameters: [] }]
                        }]
                }]
        })
    })

    test("Should able to reflect global module", async () => {
        const result = await reflect("jest")
        expect(result.type).toEqual("Object")
        expect(result.members!.length).toBeGreaterThan(0)
    })

    test("Should able to reflect relative module", async () => {
        const result = await reflect("../src/reflect")
        expect(result.type).toEqual("Object")
        expect(result.members!.length).toBeGreaterThan(0)
    })
})

