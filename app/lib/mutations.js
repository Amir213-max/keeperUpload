// Mutation map (schema.graphql): see each export name vs server Mutation fields\n// lib/mutations.js
import { gql } from "graphql-request";
import { graphqlClient } from "./graphqlClient";
import { v4 as uuidv4 } from "uuid"; 


export async function createOrderFromCurrentCart() {
    try {
      // 1️⃣ جلب الكارت الحالي
      const cart = await fetchUserCart();
  
      // 2️⃣ تجهيز input
      const input = {
        payment_status: "PROCESSING",
        tags: ["web_order"],
        tracking_urls: [],
        published: true,
      };
  
      // 3️⃣ استدعاء الـ mutation مع cart_id
      const response = await graphqlClient.request(CREATE_ORDER_FROM_CART, {
        cart_id: cart_id,  // ⚠️ cart_id مطلوب
        input: {
          payment_status: "PROCESSING",
          shipping_type: "normal",
          empty_cart: true,
          reference_id: "WEB-TEST-123"
        }
      });
  
      console.log("✅ Order Created:", response.createOrderFromCart);
      return response.createOrderFromCart;
  
    } catch (error) {
      console.error("❌ Error creating order from cart:", error);
      throw error;
    }
  }
  




// --- Queries & Mutations ---

export const GET_USER_CART = gql`
  query UserCart($user_id: ID!) {
    userCart(user_id: $user_id) {
      id
      items {
        id
        variant_id
        quantity
        product {
          images
          offer_code
          id
          name
           productBadges{
        label
        color
      }
          list_price_amount
      list_price_currency
      relative_list_price_difference
      price_range_from
      price_range_to
      price_range_currency
      price_range_exact_amount
      price_range_maximum_amount
      price_range_minimum_amount
        }
      }
    }
  }
`;



export const ADD_TO_WISHLIST = gql`
  mutation AddToWishlist($input: AddToWishlistInput!) {
    addToWishlist(input: $input) {
      success
      message
      wishlist_item {
        id
        product {

          id
          name
        }
      }
    }
  }
`;


export const CREATE_CART = gql`
  mutation CreateCart($input: CartInput!) {
    createCart(input: $input) {
      id
      user_id
      items {
        id
       
      }
    }
  }
`;

 export const ADD_ITEM_TO_CART = gql`
  mutation AddItemToCart($input: AddCartItemInput!) {
    addItemToCart(input: $input) {
      id
      variant_id
      quantity
      product {
        id
         productBadges{
        label
        color
      }
        name
        list_price_amount
        list_price_currency
        relative_list_price_difference
        price_range_from
        price_range_to
        price_range_currency
        price_range_exact_amount
        price_range_maximum_amount
        price_range_minimum_amount
      }
    }
  }
`;

export const CREATE_ORDER_FROM_CART = gql`
mutation CreateOrderFromCart($cart_id: ID!, $input: CreateOrderFromCartInput!) {
  createOrderFromCart(cart_id: $cart_id, input: $input) {
    id
    user{
      name
      name
      email
      phone
    gender
      created_at
      updated_at
      
    }

    number
    shipping_type
    shipping_cost
    total_amount
    vat_amount
  }
}
`;



export const EMPTY_CART = gql`
  mutation EmptyCart($cart_id: ID!) {
    emptyCart(cart_id: $cart_id) {
      id
    }
  }
`;
  
export const UPDATE_CART_ITEM_QUANTITY = gql`
  mutation UpdateCartItemQuantity($id: ID!, $quantity: Int!) {
    updateCartItem(id: $id, input: { quantity: $quantity }) {
      id
      quantity
      product {
       productBadges{
        label
       color
      }
        id
        name
        price_range_exact_amount
        list_price_amount
      }
    }
  }
`;

export const REMOVE_ITEM_FROM_CART = gql`
  mutation RemoveFromCart($id: ID!) {
    removeItemFromCart(id: $id) {
      id
      cart_id
      product_id
      quantity
    }
  }
`;

export const APPLY_OFFER_CODE_TO_ORDER = gql`
  mutation ApplyOfferCodeToOrder($order_id: ID!, $offer_code: String!) {
    applyOfferCodeToOrder(order_id: $order_id, offer_code: $offer_code) {
      discount_amount
      offer_code
      offer {
        minimum_order_amount
      }
    }
  }
`;



// 🔹 Signup
export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      token
      user {
        id
        name
        email
        phone
        date_of_birth
        gender
      }
      message
    }
  }
`;

export const SIGNIN_MUTATION = gql`
  mutation Signin($input: SigninInput!) {
    signin(input: $input) {
      token
      user {
        id
        wishlists{
          id
        }
        defaultWishlist{
          id
        }
        name
        email
        phone
        date_of_birth
        gender
      }
      message
    }
  }
`;




export const CREATE_ORDER_WITH_TAP_PAYMENT = gql`
  mutation CreateOrderWithTapPayment($input: TapPaymentInput!) {
    createOrderWithTapPayment(input: $input) {
      success
      payment_url
      transaction_id
      order_id
      message
      error
      order {
        id
        number
        total_amount
        
      }
    }
  }
`;



export const CREATE_TAP_PAYMENT = gql`
mutation CreateOrderWithTapPayment($input: TapPaymentInput!) {
  createOrderWithTapPayment(input: $input) {
    success
    payment_url
    
    order_id
    transaction_id
    message
    order {
      user{
        id
        email
        name
        phone
        date_of_birth
        gender
        avatar
        email_verified_at
     
        created_at
        updated_at
        
      }
      id
      number
      shipping_type
      shipping_cost
      total_amount
      
     
    }
  }
}
`;
// 🔹 Example: Create Order from Cart
export const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrderFromCart($cart_id: ID!, $input: CreateOrderFromCartInput!) {
    createOrderFromCart(cart_id: $cart_id, input: $input) {
      id
      status
      total
    }
  }
`;


// ✅ دالة للحصول على user_id ديناميكي
export function getDynamicUserId() {
  // لو المستخدم عامل تسجيل دخول (مخزن بياناته في localStorage)
  const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user")) : null;
  if (user?.id) return user.id;

  // لو المستخدم ضيف (guest)
  let guestId = typeof window !== "undefined" ? localStorage.getItem("guest_id") : null;

  if (!guestId) {
    guestId = uuidv4(); // توليد ID جديد
    localStorage.setItem("guest_id", guestId);
  }

  return guestId;
}

// Function to execute mutation
export async function removeItemFromCart(id) {
  try {
    const response = await graphqlClient.request(REMOVE_ITEM_FROM_CART, { id });
    return response.removeItemFromCart;
  } catch (error) {
    console.error("Error removing item from cart:", error);
    throw error;
  }
}


// 🔹 Helper لتحويل شكل الـ cart لـ lineItems
function normalizeCart(cart) {
  return {
    id: cart.id,
    lineItems: cart.items.map((item) => ({
      id: item.id,
      variantId: item.variant_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      product: item.product,
      variant: null,
      variantSku: null,
    })),
  };
}

/** Minimal product fetch: API CartItem has no `variant` relation; match variant_id client-side. */
const CART_PRODUCT_FOR_STOCK = gql`
  query CartProductForStock($id: String!) {
    product(id: $id) {
      id
      variants {
        id
        variant_sku
        size
        stock {
          qty
          minQty
          maxQty
          isInStock
        }
      }
    }
  }
`;

const CART_PRODUCT_STOCK_CACHE_TTL_MS = 2 * 60 * 1000;
const cartProductStockCache = new Map();

async function enrichCartLineItemsWithVariantStock(cart) {
  if (!cart?.lineItems?.length) return cart;
  const productIds = [
    ...new Set(
      cart.lineItems
        .map((li) => li.product?.id)
        .filter((id) => id != null && String(id).trim() !== "")
    ),
  ];
  if (productIds.length === 0) return cart;

  const productById = {};
  await Promise.all(
    productIds.map(async (pid) => {
      try {
        const cached = cartProductStockCache.get(String(pid));
        if (cached && Date.now() - cached.ts < CART_PRODUCT_STOCK_CACHE_TTL_MS) {
          if (cached.data?.id) {
            productById[String(cached.data.id)] = cached.data;
          }
          return;
        }
        const data = await graphqlClient.request(CART_PRODUCT_FOR_STOCK, {
          id: String(pid),
        });
        if (data?.product?.id) {
          productById[String(data.product.id)] = data.product;
          cartProductStockCache.set(String(data.product.id), {
            ts: Date.now(),
            data: data.product,
          });
        }
      } catch (e) {
        console.warn("[enrichCart] product fetch failed", pid, e?.message || e);
      }
    })
  );

  const lineItems = cart.lineItems.map((item) => {
    const pid = item.product?.id != null ? String(item.product.id) : null;
    const product = pid ? productById[pid] : null;
    const variants = product?.variants;
    const vid = item.variantId ?? item.variant_id;
    if (!variants?.length || vid == null || vid === "") {
      return item;
    }
    const matched = variants.find((v) => String(v.id) === String(vid));
    if (!matched) return item;
    return {
      ...item,
      variant: matched,
      variantSku: matched.variant_sku ?? item.variantSku ?? null,
    };
  });

  return { ...cart, lineItems };
}

/**
 * Add line to user cart via GraphQL (requires variant_id per AddCartItemInput).
 */
export async function addToCartTempUser(productId, quantity = 1, unitPrice = 0, variantId = null) {
  try {
    // ✅ log endpoint

    if (variantId == null || variantId === "") {
      throw new Error("variant_id is required to add this item to the cart");
    }

    const userId = getDynamicUserId(); 
    // 1️⃣ جلب الكارت الحالي لليوزر المؤقت
    const cartData = await graphqlClient.request(GET_USER_CART, {
      user_id:userId,
    });
    console.log("📦 [Current Cart]:", cartData);

    let cartId = cartData.userCart?.id;

    // 2️⃣ لو مفيش كارت، نعمله
    if (!cartId) {
      console.log("🆕 [No Cart Found] → Creating new cart...");
      const newCartInput = {
        user_id: userId,
        item_total: 0,
        grand_total: 0,
        shipping_costs: 0,
      };
      const newCart = await graphqlClient.request(CREATE_CART, {
        input: newCartInput,
      });
      cartId = newCart.createCart.id;
      console.log("✅ [New Cart Created]:", newCart);
    }

    // 3️⃣ توليد مفتاح فريد للعنصر
    const itemKey = uuidv4();
    console.log("🔑 [Generated Item Key]:", itemKey);

    // 4️⃣ إضافة المنتج للكارت
    const addItemInput = {
      cart_id: cartId,
      product_id: productId,
      variant_id: String(variantId),
      quantity,
      unit_price: unitPrice ,
     
     
    };
    console.log("➕ [Add Item Input]:", addItemInput);

    const addedItem = await graphqlClient.request(ADD_ITEM_TO_CART, {
      input: addItemInput,
    });
    console.log("✅ [Item Added]:", addedItem);

    // ✅ رجّع الكارت كامل بعد الإضافة
    const updatedCart = await fetchUserCart();
    console.log("🛒 [Updated Cart]:", updatedCart);
    return updatedCart;
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    throw error;
  }
}

// --- جلب الكارت الحالي للـ user ---
export async function fetchUserCart() {
  const userId = getDynamicUserId(); // ✅ جديد

  console.log("📡 [Fetching Cart for user_id]:", userId);

  const { userCart } = await graphqlClient.request(GET_USER_CART, {
    user_id: userId,
  });

  if (!userCart) {
    console.log("🆕 [No Cart Found] → Creating one...");
    const newCart = await graphqlClient.request(CREATE_CART, {
      input: {
        user_id: userId,
        item_total: 0,
        grand_total: 0,
        shipping_costs: 0,
      },
    });
    console.log("✅ [New Cart Created in fetchUserCart]:", newCart);
    const emptyCart = normalizeCart(newCart.createCart);
    return enrichCartLineItemsWithVariantStock(emptyCart);
  }

  console.log("📦 [Cart Found]:", userCart);
  const normalized = normalizeCart(userCart);
  return enrichCartLineItemsWithVariantStock(normalized);
}

/** Client-side (via /api/graphql): update authenticated user's profile */
export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      message
      user {
        id
        name
        email
        phone
        date_of_birth
        gender
        avatar
        created_at
        updated_at
      }
    }
  }
`;

/** Client-side (via /api/graphql): change password for authenticated user */
export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      success
      message
    }
  }
`;

