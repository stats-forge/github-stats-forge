import { describe, expect, it } from 'vitest';

import { renderRepoCard } from '../src/cards/repo/index.ts';
import { renderStatsCard } from '../src/cards/stats/index.ts';
import { renderError } from '../src/common/render.ts';

import { draw, exactly } from './_card.ts';
import { cards, repoData, statsData } from './_cards.ts';

describe('card accessibility', () => {
  it.each(Object.entries(cards))('%s announces itself as a labelled image', (_name, render) => {
    const svg = draw(render());

    expect(svg).toHaveAttribute('role', 'img');
    // both ids, so the title is not merely present but actually announced
    expect(svg).toHaveAttribute('aria-labelledby', 'title-id desc-id');
  });

  it.each(Object.entries(cards))('%s labels itself with a non-empty title', (_name, render) => {
    draw(render());

    // at least one non-whitespace character, so an empty label fails
    expect(document.querySelector('title#title-id')).toHaveTextContent(/\S/);
  });

  it.each(Object.entries(cards))(
    '%s describes its content for a screen reader',
    (_name, render) => {
      draw(render());

      // `role="img"` hides the inner text, so an empty desc means the card's
      // numbers reach a screen reader as nothing at all.
      expect(document.querySelector('desc#desc-id')).toHaveTextContent(/\S/);
    },
  );

  it('names every id the label points at', () => {
    const svg = draw(renderStatsCard(statsData));

    const ids = svg.getAttribute('aria-labelledby')?.split(' ') ?? [];
    expect(ids).not.toHaveLength(0);
    for (const id of ids) {
      expect(document.querySelector(`#${id}`)).toBeInTheDocument();
    }
  });

  it('labels the error card, which a host renders in the same <img> slot', () => {
    const svg = draw(
      renderError({ message: 'Something went wrong', secondaryMessage: 'Try again' }),
    );

    expect(svg).toHaveAttribute('role', 'img');
    expect(document.querySelector('title#title-id')).toHaveTextContent(
      exactly('Something went wrong'),
    );
    expect(document.querySelector('desc#desc-id')).toHaveTextContent(exactly('Try again'));
  });
});

describe('card accessibility and locale', () => {
  it('keeps the repo description free of untranslated English', () => {
    // The card honours `locale`, so its label must not introduce words the card cannot translate.
    draw(renderRepoCard(repoData, { locale: 'cn' }));

    const desc = document.querySelector('desc#desc-id')?.textContent ?? '';
    expect(desc).not.toMatch(/\b(?:Stars|Forks|Language)\b/);
  });
});
