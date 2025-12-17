# Shopify E-commerce API

Test data generation for Shopify's e-commerce platform.

## What It Models

- **Products** with variants, images, and pricing
- **Customers** with addresses and purchase history
- **Orders** with line items, shipping, tax, and discounts
- **Inventory** levels and locations
- **Collections** for product organization
- **Gift Cards** with balance tracking

## Key Lessons

### Deeply Nested Structures
Products contain variants which have their own complex fields:
```vague
schema Product {
  variants: 1..6 of ProductVariant,
  images: 1..5 of Image
}
```

### Referencing Nested Collections
Order line items reference product variants:
```vague
variant: any of products.variants
```

### Customer Metrics via Side Effects
Orders update customer purchase history:
```vague
schema Order {
  customer: any of customers,
  total_price: decimal in 10..5000
} then {
  customer.orders_count += 1,
  customer.total_spent += total_price
}
```

### Multiple Computed Totals
```vague
subtotal_price: = sum(line_items.price) * sum(line_items.quantity),
total_shipping: = sum(shipping_lines.price),
total_tax: = sum(tax_lines.price),
total_discounts: = sum(discount_codes.amount)
```

### Constraints on Gift Cards
```vague
assume balance <= initial_value
```

## Running

```bash
node dist/cli.js examples/shopify/ecommerce.vague -p
```

**Note:** This example uses faker shorthand functions that require the faker plugin.
