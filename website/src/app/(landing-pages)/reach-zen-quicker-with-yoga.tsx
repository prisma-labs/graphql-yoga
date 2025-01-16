import { ComponentProps, FC } from 'react';
import { CallToAction, Heading, ComparisonTable as Table } from '@theguild/components';
import ComparisonTable from '../comparison-table.mdx';

export const ReachZenQuickerWithYoga: FC<ComponentProps<'section'>> = props => {
  return (
    <section {...props}>
      <Heading as="h2" size="md" className="text-balance sm:text-center px-4">
        Using Apollo Server? Reach zen quicker with Yoga.
      </Heading>
      <div className="mx-4 flex max-lg:flex-col gap-6 lg:gap-24 mt-6 sm:mt-[64px]">
        <div className="basis-1/4">
          <Heading as="h3" size="sm" className="max-sm:text-2xl">
            Runtime&nbsp;Performance Champion
          </Heading>
          <p className="text-green-800 mt-4 mb-6">
            Yoga demonstrates superior performance with lower latency and higher request rates than
            Apollo Server. Benchmarked.
          </p>
          <CallToAction variant="tertiary" href="/docs/comparison#graphql-yoga-and-apollo-server">
            Detailed Apollo Server Comparison
          </CallToAction>
        </div>

        <ComparisonTable
          components={{
            table(props: any) {
              return <Table className="grow" {...props} />;
            },
            tr(props: any) {
              const content = props.children[0].props.children.props?.children;
              const isHighlight = content?.includes('Response Cache');
              return <Table.Row highlight={isHighlight} {...props} />;
            },
            td(props: any) {
              const content = props.children.props?.children;
              const isHighlight = content?.includes('Response Cache');
              return <Table.Cell className={isHighlight ? '!bg-green-100' : ''} {...props} />;
            },
            th(props: any) {
              return <Table.Header className="sm:w-1/4 whitespace-pre" {...props} />;
            },
          }}
        />
      </div>
    </section>
  );
};
