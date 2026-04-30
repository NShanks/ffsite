// Shared Framer Motion variants — import where needed

export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0 },
};

export const pageTransition = {
  duration: 0.18,
  ease: 'easeOut',
};

// Container that staggers its children
export const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045 },
  },
};

// Each staggered child: fades in and rises 12px
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
};
