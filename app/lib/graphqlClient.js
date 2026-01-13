import { GraphQLClient } from "graphql-request";

const endpoint =

  process.env.GRAPHQL_ENDPOINT || "https://keepersport.store/graphql";

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    "Content-Type": "application/json",
  },
});

// دي أهم خطوة ⬇️
// نضيف دالة صغيرة تحدث الهيدر بالـ token قبل أي طلب
export const setAuthToken = (token) => {
  if (token) {
    graphqlClient.setHeader("Authorization", `Bearer ${token}`);
  } else {
    graphqlClient.setHeaders({ "Content-Type": "application/json" }); // reset
  }
};

/**
 * Enhanced request method that handles GraphQL errors with partial data
 * This is a wrapper around rawRequest that filters problematic data
 */
export async function graphqlRequestSafe(query, variables = {}) {
  const maxRetries = 2;
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use rawRequest to get both data and errors
      let result;
      try {
        result = await graphqlClient.rawRequest(query, variables);
      } catch (rawError) {
        // rawRequest might throw even with partial data
        // Check if the error contains response data
        if (rawError?.response) {
          result = rawError.response;
          console.warn("rawRequest threw error but has response data:", {
            hasData: !!rawError.response.data,
            hasErrors: !!rawError.response.errors,
          });
        } else if (rawError?.data || rawError?.errors) {
          // Some error formats have data/errors directly
          result = { data: rawError.data || null, errors: rawError.errors || null };
          console.warn("rawRequest threw error but has data/errors directly");
        } else {
          // Log the raw error to understand its structure
          console.error("rawRequest threw error with no extractable data:", {
            errorType: rawError?.constructor?.name,
            errorKeys: rawError ? Object.keys(rawError) : [],
            errorString: String(rawError),
            error: rawError,
          });
          // Re-throw if we can't extract anything
          throw rawError;
        }
      }
      
      const { data, errors } = result || {};

      // Clean up variant data if needed (even without errors, to be safe)
      if (data) {
        if (data.product && data.product.variants) {
          data.product.variants = data.product.variants.filter(
            (variant) => variant !== null && variant !== undefined
          );
        }
        if (data.productBySku && data.productBySku.variants) {
          data.productBySku.variants = data.productBySku.variants.filter(
            (variant) => variant !== null && variant !== undefined
          );
        }
      }

      // Handle GraphQL errors - GraphQL can return partial data even with errors
      if (errors && errors.length > 0) {
        // Check if the error is about null variant names or other variant issues
        const isVariantError = errors.some(
          (err) => err.path && Array.isArray(err.path) && err.path.includes("variants")
        );

        // If we have partial data despite errors, return it
        if (data) {
          // Log the error but return partial data
          if (isVariantError) {
            console.warn("GraphQL returned partial data with variant errors (filtered):", errors);
          } else {
            console.warn("GraphQL returned partial data with errors:", errors);
          }
          return data;
        }
        
        // Check if product is null but we have errors - might be a variant issue causing null product
        // Try to return null data structure to indicate the query ran but product wasn't found
        console.warn("GraphQL errors but no data returned. Errors:", errors);
        const errorMessages = errors.map((err) => err.message || err.debugMessage || "Unknown error").join("; ");
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }

      return data || null;
    } catch (error) {
      // Store error for potential retry
      lastError = error;
      
      // Check if this is a retryable error (network errors, timeouts, etc.)
      const isRetryable = attempt < maxRetries && (
        !error?.response || // Network error
        error?.statusCode >= 500 || // Server error
        error?.message?.includes('fetch failed') || // Fetch failed
        error?.message?.includes('timeout') // Timeout
      );
      
      if (isRetryable) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn(`GraphQL request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }
      
      // Not retryable or all retries exhausted - try to extract partial data
      // Check if error has response data (partial data)
      if (error?.response) {
        const { data, errors } = error.response;
        
        // If we have data, try to return it even with errors
        if (data) {
          console.warn("GraphQL error but returning partial data from error.response:", errors);
          
          // Clean up variant data if needed
          if (data.product && data.product.variants) {
            data.product.variants = data.product.variants.filter(
              (variant) => variant !== null && variant !== undefined
            );
          }
          if (data.productBySku && data.productBySku.variants) {
            data.productBySku.variants = data.productBySku.variants.filter(
              (variant) => variant !== null && variant !== undefined
            );
          }
          
          return data;
        }
      }
      
      // Check if error has data property directly (some error formats)
      if (error?.data) {
        console.warn("GraphQL error but found data in error.data:", error.data);
        return error.data;
      }
      
      // Check if error has errors array with response data
      if (error?.errors && Array.isArray(error.errors)) {
        console.warn("GraphQL error has errors array:", error.errors);
        // Some GraphQL libraries put data in the error object itself
        if (error.data) {
          return error.data;
        }
      }
      
      // If no partial data and not retryable, break to throw error
      break;
    }
  }
  
  // Log full error for debugging
  const errorDetails = {
    message: lastError?.message,
    response: lastError?.response,
    data: lastError?.data,
    errors: lastError?.errors,
    statusCode: lastError?.statusCode,
    status: lastError?.status,
    variables: variables,
    errorType: lastError?.constructor?.name,
    errorString: String(lastError),
    errorKeys: lastError ? Object.keys(lastError) : [],
  };
  
  console.error("GraphQL Request Error Details:", errorDetails);
  
  // Create a more informative error message
  const errorMessage = lastError?.message || 
                      lastError?.response?.errors?.[0]?.message || 
                      lastError?.errors?.[0]?.message ||
                      String(lastError) ||
                      "Unknown GraphQL error";
  
  // Re-throw with more context if no partial data available
  const enhancedError = new Error(errorMessage);
  enhancedError.originalError = lastError;
  enhancedError.response = lastError?.response;
  enhancedError.data = lastError?.data;
  throw enhancedError;
}

// Override the default request method to use our safe version
const originalRequest = graphqlClient.request.bind(graphqlClient);
graphqlClient.request = graphqlRequestSafe;
