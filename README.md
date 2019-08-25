# react-firehook

React Firehook is a super effective and simple way to set up live Firestore subscriptions from modern React components. Our company values are:

**Unobtrusive** 🌳

Use as much as you want. Can be gradually introduced or removed.

**Fast development** 🔥

Only one hook, regardless of whether you are subscribing to a document, collection or query. Returned collections are delivered as objects mapping keys to documents. Easy to remember and refactor.

**Subscription caching** ♻️

Even though several components are subscribed to the same ref or query (according to ref.isEqual), firehook only opens one actual subscription, which it propagates to every subscriber. In addition, when subscriptions are closed, firehook keeps the old subscriptions around for a few seconds. This prevents uneccessary delays when navigating between pages that share subscriptions! Not having to worry about duplicate subscriptions improves developer experience. Shorter page loads improve user experience.

**High-tech logging** 🔎

Shows all currently open subscriptions, as well as the components that are causing each one right now.

**Complete example component:**

```js
import React from "react";
import { useSubscription } from "react-firehook";
import { profilesRef } from "./myFirebaseStuff";

export default function ProfileEditor(props) {
  const { profileId } = props;

  const { id, ref, ready, data } = useSubscription(profilesRef.doc(profileId));

  if (!ready) return <p>Loading...</p>;

  if (!data) return <p>Document does not exist!</p>;

  const { displayName } = data;

  return (
    <>
      <h1>
        {displayName} ({id})
      </h1>
      <input
        type="text"
        defaultValue={displayName}
        onBlur={({ target: { value: displayName } }) =>
          ref.update({ displayName })
        }
      />
    </>
  );
}
```

## Logging

Put this somewhere in your code (for example, together with your firebase config) to enable fancy logging in development mode:

```js
import { configureFirehook } from "react-firehook";

configureFirehook({
  log: process.env.NODE_ENV === "development"
});
```
