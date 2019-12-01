import reflect from "../src"
import { join } from "path"


describe("Durability", () => {
    it("Should not error parsing index", () => {
        reflect(join(__dirname, "../src/index.js"))
    })
})