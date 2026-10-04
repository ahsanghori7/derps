export const projectNameToSlug = (name) => {
  if (!name) return '';
  return name.replace(/\s+/g, '-').toLowerCase();
};

export const slugToDisplayName = (slug) => {
  if (!slug) return null;
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Path-based project list URL:
 * /home/projectTracking/list/{slug}/{projectId}
 * /home/projectTracking/list/{slug}/{projectId}/{page}
 * /home/projectTracking/list/{slug}/{projectId}/{page}/{rowsPerPage}
 */
export const buildProjectListPath = ({
  slug,
  projectId,
  page = 1,
  rowsPerPage = 25,
} = {}) => {
  const segments = ['/home', 'projectTracking', 'list'];
  if (slug) segments.push(slug);
  if (projectId != null && projectId !== '') {
    segments.push(String(projectId));
  }
  if (page !== 1) segments.push(String(page));
  if (rowsPerPage !== 25) segments.push(String(rowsPerPage));
  return segments.join('/');
};

export const parseProjectTrackingPath = (pathname, search = '') => {
  const pathSegments = pathname.split('/').filter(Boolean);
  const projectTrackingIndex = pathSegments.indexOf('projectTracking');

  if (projectTrackingIndex === -1) {
    return {
      tab: 'board',
      page: 1,
      rowsPerPage: 25,
      projectSlug: null,
      projectId: null,
    };
  }

  const remainingSegments = pathSegments.slice(projectTrackingIndex + 1);
  const query = new URLSearchParams(search);
  const queryProjectId = query.get('projectId');

  let tab = 'board';
  let page = 1;
  let rowsPerPage = 25;
  let projectSlug = null;
  let projectId = null;

  if (remainingSegments.length > 0) {
    tab = remainingSegments[0] || 'board';

    if (tab === 'list' && remainingSegments[1]) {
      projectSlug = remainingSegments[1];
      const seg2 = remainingSegments[2];
      const seg3 = remainingSegments[3];
      const seg4 = remainingSegments[4];

      if (seg2 !== undefined && /^\d+$/.test(seg2)) {
        if (seg3 !== undefined && /^\d+$/.test(seg3)) {
          projectId = seg2;
          page = parseInt(seg3, 10) || 1;
          if (seg4 !== undefined && /^\d+$/.test(seg4)) {
            rowsPerPage = parseInt(seg4, 10) || 25;
          }
        } else if (queryProjectId) {
          projectId = queryProjectId;
          page = parseInt(seg2, 10) || 1;
          if (seg3 !== undefined && /^\d+$/.test(seg3)) {
            rowsPerPage = parseInt(seg3, 10) || 25;
          }
        } else {
          projectId = seg2;
        }
      }
    } else if (tab !== 'list' && remainingSegments[1]) {
      page = parseInt(remainingSegments[1], 10) || 1;
      if (remainingSegments[2]) {
        rowsPerPage = parseInt(remainingSegments[2], 10) || 25;
      }
    }
  }

  if (!projectId && queryProjectId) {
    projectId = queryProjectId;
  }

  return { tab, page, rowsPerPage, projectSlug, projectId };
};
