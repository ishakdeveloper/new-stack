import { Elysia, t } from "elysia";
import { sendFriendRequest } from "./sendFriendRequest";
import { acceptFriendRequest } from "./acceptFriendRequest";
import { getPendingFriendRequests } from "./getPendingFriendRequests";
import { getAllFriends } from "./getAllFriends";
import { removeFriend } from "./removeFriend";
import { declineFriendRequest } from "./declineFriendRequest";

export const friendshipRoutes = new Elysia()
  .use(sendFriendRequest)
  .use(acceptFriendRequest)
  .use(declineFriendRequest)
  .use(getPendingFriendRequests)
  .use(getAllFriends)
  .use(removeFriend);
