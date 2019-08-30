# react-firehook

React Firehook is a super effective and simple way to set up live Firestore subscriptions from modern React components. Our company values are:

**Unobtrusive** 🌳

Only use as much as you want. Can be gradually introduced or removed.

**Fast development** 🔥

Use one hook, regardless of whether you are subscribing to a document, collection or query. When passing a collection or query ref, the results are delivered as an object mapping keys to documents.

**Subscription caching** ♻️

Even though several components are subscribed to the same ref or query (according to ref.isEqual), firehook only opens one actual subscription, which it propagates to every subscriber. In addition, when subscriptions are closed, firehook keeps the old subscriptions around for a few seconds. This prevents uneccessary delays when navigating between pages that share subscriptions! Not having to worry about duplicate subscriptions improves developer experience. Shorter page loads improve user experience.

**High-tech logging** 🔎

Shows all currently open subscriptions, including the names of the source components and hooks making them.

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

![Debug console screenshot](https://raw.githubusercontent.com/jbe/react-firehook/master/debug_log.png)
