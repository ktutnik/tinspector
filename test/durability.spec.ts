import reflect from "../src"
import { join } from "path"


describe("Durability", () => {
    it("Should not error parsing typescript", () => {
        reflect("typescript")
    })
})