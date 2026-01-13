// "use client";

// import { useEffect, useState } from "react";
// import { gql, useQuery, useMutation } from "@apollo/client";
// import { client } from "../lib/apolloClient";
// import { Bell } from "lucide-react";

// // Query لجلب إشعارات المستخدم
// const GET_NOTIFICATIONS = gql`
//   query GetUserNotifications($user_id: ID!) {
//     userNotifications(user_id: $user_id) {
//       id
//       data
//       read_at
//       created_at
//     }
//   }
// `;

// // Mutation لتعليم إشعار كمقروء
// const MARK_AS_READ = gql`
//   mutation MarkNotificationAsRead($input: MarkNotificationAsReadInput!) {
//     markNotificationAsRead(input: $input) {
//       id
//       read_at
//     }
//   }
// `;

// export default function NotificationsDropdown({ userId }) {
//   const { data, refetch } = useQuery(GET_NOTIFICATIONS, {
//     variables: { user_id: userId },
//     client,
//   });

//   const [markAsRead] = useMutation(MARK_AS_READ, { client });

//   const [open, setOpen] = useState(false);

//   const notifications = data?.userNotifications || [];
//   const unreadCount = notifications.filter(n => !n.read_at).length;

//   const handleMarkAsRead = async (id) => {
//     await markAsRead({ variables: { input: { notification_id: id } } });
//     refetch();
//   };

//   return (
//     <div className="relative">
//       {/* أيقونة الجرس */}
//       <button onClick={() => setOpen(!open)} className="relative">
//         <Bell className="w-6 h-6 text-gray-800" />
//         {unreadCount > 0 && (
//           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5   flex items-center justify-center">
//             {unreadCount}
//           </span>
//         )}
//       </button>

//       {/* Dropdown */}
//       {open && (
//         <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg   z-50">
//           <h3 className="p-2 font-bold border-b">Notifications</h3>
//           <ul>
//             {notifications.length === 0 && (
//               <li className="p-2 text-gray-500">No notifications</li>
//             )}
//             {notifications.map((n) => {
//               const data = JSON.parse(n.data);
//               return (
//                 <li
//                   key={n.id}
//                   onClick={() => handleMarkAsRead(n.id)}
//                   className={`p-2 cursor-pointer border-b hover:bg-gray-100 ${
//                     !n.read_at ? "bg-gray-200 font-semibold" : ""
//                   }`}
//                 >
//                   <p className="text-sm">{data.title}</p>
//                   <p className="text-xs text-gray-600">{data.body}</p>
//                   <p className="text-[10px] text-gray-400">
//                     {new Date(n.created_at).toLocaleString()}
//                   </p>
//                 </li>
//               );
//             })}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }
