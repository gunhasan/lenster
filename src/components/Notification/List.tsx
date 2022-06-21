import { gql, useQuery } from '@apollo/client'
import { EmptyState } from '@components/UI/EmptyState'
import { ErrorMessage } from '@components/UI/ErrorMessage'
import { Spinner } from '@components/UI/Spinner'
import { Notification, PaginatedResultInfo } from '@generated/types'
import { CollectModuleFields } from '@gql/CollectModuleFields'
import { MetadataFields } from '@gql/MetadataFields'
import { MinimalProfileFields } from '@gql/MinimalProfileFields'
import { Menu } from '@headlessui/react'
import { MailIcon } from '@heroicons/react/outline'
import consoleLog from '@lib/consoleLog'
import { FC, useState } from 'react'
import { useInView } from 'react-cool-inview'
import { usePersistStore } from 'src/store'

import NotificationShimmer from './Shimmer'
import CollectNotification from './Type/CollectNotification'
import CommentNotification from './Type/CommentNotification'
import FollowerNotification from './Type/FollowerNotification'
import MentionNotification from './Type/MentionNotification'
import MirrorNotification from './Type/MirrorNotification'

const NOTIFICATIONS_QUERY = gql`
  query Notifications($request: NotificationRequest!) {
    notifications(request: $request) {
      items {
        ... on NewFollowerNotification {
          wallet {
            address
            defaultProfile {
              ...MinimalProfileFields
            }
          }
          createdAt
        }
        ... on NewMentionNotification {
          mentionPublication {
            ... on Post {
              id
              profile {
                ...MinimalProfileFields
              }
              metadata {
                content
              }
            }
            ... on Comment {
              id
              profile {
                ...MinimalProfileFields
              }
              metadata {
                content
              }
            }
          }
          createdAt
        }
        ... on NewCommentNotification {
          profile {
            ...MinimalProfileFields
          }
          comment {
            id
            metadata {
              content
            }
            commentOn {
              ... on Post {
                id
              }
              ... on Comment {
                id
              }
              ... on Mirror {
                id
              }
            }
          }
          createdAt
        }
        ... on NewMirrorNotification {
          profile {
            ...MinimalProfileFields
          }
          publication {
            ... on Post {
              id
              metadata {
                name
                content
                attributes {
                  value
                }
              }
            }
            ... on Comment {
              id
              metadata {
                name
                content
                attributes {
                  value
                }
              }
            }
          }
          createdAt
        }
        ... on NewCollectNotification {
          wallet {
            address
            defaultProfile {
              ...MinimalProfileFields
            }
          }
          collectedPublication {
            ... on Post {
              id
              metadata {
                ...MetadataFields
              }
              collectModule {
                ...CollectModuleFields
              }
            }
            ... on Comment {
              id
              metadata {
                ...MetadataFields
              }
              collectModule {
                ...CollectModuleFields
              }
            }
          }
          createdAt
        }
      }
      pageInfo {
        next
      }
    }
  }
  ${MinimalProfileFields}
  ${CollectModuleFields}
  ${MetadataFields}
`

const List: FC = () => {
  const { currentUser } = usePersistStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pageInfo, setPageInfo] = useState<PaginatedResultInfo>()
  const { data, loading, error, fetchMore } = useQuery(NOTIFICATIONS_QUERY, {
    variables: {
      request: { profileId: currentUser?.id, limit: 10 }
    },
    fetchPolicy: 'no-cache',
    onCompleted(data) {
      setPageInfo(data?.notifications?.pageInfo)
      setNotifications(data?.notifications?.items)
      consoleLog('Query', '#8b5cf6', `Fetched first 10 notifications`)
    }
  })

  const { observe } = useInView({
    onEnter: () => {
      fetchMore({
        variables: {
          request: {
            profileId: currentUser?.id,
            cursor: pageInfo?.next,
            limit: 10
          }
        }
      }).then(({ data }: any) => {
        setPageInfo(data?.notifications?.pageInfo)
        setNotifications([...notifications, ...data?.notifications?.items])
        consoleLog(
          'Query',
          '#8b5cf6',
          `Fetched next 10 notifications Next:${pageInfo?.next}`
        )
      })
    }
  })

  if (loading)
    return (
      <div className="divide-y dark:divide-gray-700">
        <NotificationShimmer />
        <NotificationShimmer />
        <NotificationShimmer />
        <NotificationShimmer />
      </div>
    )

  if (error)
    return (
      <ErrorMessage
        className="m-3"
        title="Failed to load notifications"
        error={error}
      />
    )

  if (data?.notifications?.items?.length === 0)
    return (
      <EmptyState
        message={
          <div>
            <span>Inbox zero!</span>
          </div>
        }
        icon={<MailIcon className="w-8 h-8 text-brand" />}
        hideCard
      />
    )

  return (
    <Menu.Item as="div" className="divide-y dark:divide-gray-700">
      {notifications?.map((notification: Notification, index: number) => (
        <div key={index}>
          {notification?.__typename === 'NewFollowerNotification' && (
            <div className="p-4">
              <FollowerNotification notification={notification as any} />
            </div>
          )}
          {notification?.__typename === 'NewMentionNotification' && (
            <div className="p-4">
              <MentionNotification notification={notification as any} />
            </div>
          )}
          {notification?.__typename === 'NewCommentNotification' && (
            <div className="p-4">
              <CommentNotification notification={notification} />
            </div>
          )}
          {notification?.__typename === 'NewMirrorNotification' && (
            <div className="p-4">
              <MirrorNotification notification={notification} />
            </div>
          )}
          {notification?.__typename === 'NewCollectNotification' && (
            <div className="p-4">
              <CollectNotification notification={notification as any} />
            </div>
          )}
        </div>
      ))}
      {pageInfo?.next && (
        <span ref={observe} className="flex justify-center p-5">
          <Spinner size="sm" />
        </span>
      )}
    </Menu.Item>
  )
}

export default List
