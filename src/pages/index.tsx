import { useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';

import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

// TODO move to utils
function formatPosts(posts: PostPagination): Post[] {
  const formattedPosts = posts.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return formattedPosts;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);

  function formatDate(date: string): string {
    return format(parseISO(date), 'dd MMM yyyy', {
      locale: ptBR,
    });
  }

  async function loadMorePosts(): Promise<void> {
    const response = await fetch(nextPage);

    const data = await response.json();

    const newPosts = formatPosts(data);

    setPosts([...posts, ...newPosts]);
    setNextPage(data.next_page);
  }

  return (
    <>
      <Head>
        <title>Home | Space Traveling</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link key={post.uid} href={`post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div className={styles.postInfo}>
                  <div>
                    <FiCalendar size={22} />
                    <time>{formatDate(post.first_publication_date)}</time>
                  </div>
                  <div>
                    <FiUser size={22} />
                    <span>{post.data.author}</span>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>
        {Boolean(nextPage) && (
          <button
            className={styles.loadMore}
            type="button"
            onClick={loadMorePosts}
          >
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      fetch: ['title', 'subtitle', 'author'],
      pageSize: 1,
      page: 1,
    }
  );

  const { next_page } = postsResponse;

  const posts = formatPosts(postsResponse);

  const postsPagination = {
    next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
    },
  };
};
