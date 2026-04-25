import test from "node:test";
import assert from "node:assert/strict";
import { buildListingAttributeFacetsFromProducts } from "../app/lib/buildListingAttributeFacets.js";

test("merges attribute groups that differ only by case", () => {
  const products = [
    {
      id: "1",
      productAttributeValues: [
        { key: "Red", attribute: { label: "Color" } },
      ],
    },
    {
      id: "2",
      productAttributeValues: [
        { key: "Blue", attribute: { label: "color" } },
      ],
    },
  ];
  const { attributeValues } = buildListingAttributeFacetsFromProducts(products);
  const colorRow = attributeValues.find((r) => r.attribute.toLowerCase() === "color");
  assert.ok(colorRow, "single Color row");
  assert.equal(colorRow.values.length, 2);
});

test("each product counts once per duplicate attribute rows", () => {
  const products = [
    {
      id: "1",
      productAttributeValues: [
        { key: "M", attribute: { label: "Size" } },
        { key: "M", attribute: { label: "Size" } },
      ],
    },
  ];
  const { attributeValues } = buildListingAttributeFacetsFromProducts(products);
  const sizeRow = attributeValues.find((r) => r.attribute === "Size");
  assert.ok(sizeRow);
  assert.equal(sizeRow.countsByValue["M"], 1);
});
