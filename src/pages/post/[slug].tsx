import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const readingTime = post.data.content.reduce((acc, content) => {
    acc += content.heading.split(/\s+/).length;

    acc += RichText.asText(content.body).split(/\s+/).length;

    return Math.ceil(acc / 200);
  }, 0);

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
          <header>
            <h1>{post.data.title}</h1>
            <div className={styles.postInfo}>
              <div>
                <FiCalendar size={22} />
                <time>{post.first_publication_date}</time>
              </div>
              <div>
                <FiUser size={22} />
                <span>{post.data.author}</span>
              </div>
              <div>
                <FiClock size={22} />
                <span>{readingTime} min</span>
              </div>
            </div>

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
          </header>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    ),
    data: {
      title: RichText.asText(response.data.title),
      banner: {
        url: response.data.banner.url,
      },
      author: RichText.asText(response.data.author),
      content: response.data.content.map(content => {
        return {
          heading: RichText.asText(content.heading),
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
