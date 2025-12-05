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
