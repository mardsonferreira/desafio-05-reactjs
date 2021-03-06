import { useMemo } from 'react';
import Prismic from '@prismicio/client';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import UtterancesComments from '../../components/UtterancesComments';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PartialPost {
  uid: string;
  title: string;
}

interface PostProps {
  post: Post;
  prevPost: PartialPost | null;
  nextPost: PartialPost | null;
}

export default function Post({
  post,
  prevPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  const isEditedPost = useMemo(() => {
    return post.last_publication_date !== post.first_publication_date;
  }, [post]);

  const readingTime = useMemo(() => {
    const totalWords = post.data.content.reduce((acc, content) => {
      acc += content.heading.split(/\s+/).length;

      acc += RichText.asText(content.body).split(/\s+/).length;

      return acc;
    }, 0);

    return `${Math.ceil(totalWords / 200).toString()} min`;
  }, [post]);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  const formattedDate = format(
    parseISO(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  return (
    <>
      <Head>
        <title>{post.data.title} | Space Traveling</title>
      </Head>

      {post.data.banner && (
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt={post.data.title}
        />
      )}

      <main className={commonStyles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div className={styles.postInfo}>
            <div>
              <FiCalendar size={22} />
              <time>{formattedDate}</time>
            </div>
            <div>
              <FiUser size={22} />
              <span>{post.data.author}</span>
            </div>
            <div>
              <FiClock size={22} />
              <time>{readingTime}</time>
            </div>
          </div>
          {isEditedPost && (
            <div className={styles.postEdited}>
              <span>
                * editado em{' '}
                <time>
                  {format(new Date(post.last_publication_date), 'dd MMM yyyy', {
                    locale: ptBR,
                  })}
                </time>
                , ??s{' '}
                <time>
                  {format(
                    new Date(post.last_publication_date),
                    `${'HH'}:${'mm'}`,
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
              </span>
            </div>
          )}

          {post.data.content.map(section => (
            <section key={section.heading} className={styles.sectionContent}>
              <h2>{section.heading}</h2>
              <div
                className={styles.content}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(section.body),
                }}
              />
            </section>
          ))}
        </article>

        <footer className={styles.footer}>
          <div>
            {prevPost && (
              <>
                <span>{prevPost.title}</span>
                <Link href={`/post/${prevPost.uid}`}>
                  <a>Post anterior</a>
                </Link>
              </>
            )}
          </div>

          <div>
            {nextPost && (
              <>
                <span>{nextPost.title}</span>
                <Link href={`/post/${nextPost.uid}`}>
                  <a>Pr??ximo post</a>
                </Link>
              </>
            )}
          </div>
        </footer>

        <UtterancesComments />
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 2,
      fetch: ['uid'],
    }
  );

  const paths = postsResponse.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {});

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const prevPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['title'],
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
      after: response.id,
    }
  );

  const nextPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['title'],
      pageSize: 1,
      orderings: '[document.first_publication_date]',
      after: response.id,
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      prevPost:
        prevPost.results && prevPost.results.length
          ? {
              uid: prevPost.results[0].uid,
              title: prevPost.results[0].data.title,
            }
          : null,
      nextPost:
        nextPost.results && nextPost.results.length
          ? {
              uid: nextPost.results[0].uid,
              title: nextPost.results[0].data.title,
            }
          : null,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
