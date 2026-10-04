/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        // Background colors
        primary: {
          light: '#FFFFFF',
          dark: '#16181D',
        },
        grayButton: {
          light: '#828282',
          dark: '#FFFFFF',
        },
        fieldsTitle: {
          light: '#000000',
          dark: '#A7B0BA',
        },
        blueText: {
          light: 'blue',
          dark: '#FFFFFF',
        },
        secondary: {
          light: 'rgba(100, 153, 255, 0.06)',
          dark: 'rgba(100, 153, 255, 0.1)',
        },
        // Text colors
        text: {
          primary: {
            light: 'rgba(32, 34, 36, 1)',
            dark: '#FFFFFF',
          },
          secondary: {
            light: 'rgba(17, 17, 17, 1)',
            dark: '#A7B0BA',
          },
        },
        // Border colors
        border: {
          primary: {
            light: 'rgba(72, 128, 255, 1)',
            dark: 'rgba(72, 128, 255, 0.5)',
          },
        },
        // Button colors
        button: {
          primary: {
            light: '#0C79F7',
            dark: '#0C79F7',
          },
          text: {
            light: '#FFFFFF',
            dark: '#FFFFFF',
          },
        },
        sidebar: {
          bg: {
            light: '#FFFFFF',
            dark: '#24282E',
          },
          text: {
            primary: {
              light: '#202224',
              dark: '#FFFFFF',
            },
            secondary: {
              light: '#202224',
              dark: '#A7B0BA',
            },
            selected: {
              light: '#FFFFFF',
              dark: '#FFFFFF',
            }
          },
          item: {
            hover: {
              light: '#f4f4f4',
              dark: '#353B44',
            },
            selected: {
              light: 'rgba(72, 128, 255, 1)',
              dark: '#0C79F7',
            }
          },
          border: {
            light: 'rgba(72, 128, 255, 1)',
            dark: 'rgba(72, 128, 255, 0.5)',
          },
          divider: {
            light: '#E5E7EB',
            dark: 'rgba(255, 255, 255, 0.08)',
          }
        },
        sidebarNew: {
          bg: {
            light: '#FFFFFF',
            dark: '#24282E',
          },
          text: {
            primary: {
              light: '#2E2E2E',
              dark: '#FFFFFF',
            },
            secondary: {
              light: 'rgba(46, 46, 46, 0.45)',
              dark: '#A7B0BA',
            },
            selected: {
              light: '#0C79F7',
              dark: '#3B94F8',
            }
          },
          item: {
            hover: {
              light: '#F3F4F6',
              dark: '#353B44',
            },
            selected: {
              light: '#EAF1FD',
              dark: 'rgba(12, 121, 247, 0.18)',
            },
            open: {
              light: '#EAF1FD',
              dark: 'rgba(12, 121, 247, 0.18)',
            },
            subSelected: {
              light: 'transparent',
              dark: 'rgba(12, 121, 247, 0.12)',
            }
          },
          border: {
            light: '#0C79F7',
            dark: '#3B94F8',
          },
          divider: {
            light: '#E5E7EB',
            dark: 'rgba(255, 255, 255, 0.08)',
          }
        },
        navbar: {
          bg: {
            light: '#FFFFFF',
            dark: '#24282E',
          },
          text: {
            primary: {
              light: '#404040',
              dark: '#FFFFFF',
            },
            secondary: {
              light: '#565656',
              dark: '#A7B0BA',
            },
            border: {
              light: '#5C5C5C',
              dark: '#A7B0BA',
            }
          },
          border: {
            light: '#E5E7EB',
            dark: 'rgba(255, 255, 255, 0.08)',
          },
          dropdown: {
            bg: {
              light: '#FFFFFF',
              dark: '#353B44',
            },
            hover: {
              light: '#0C79F7',
              dark: '#0C79F7',
            },
            text: {
              light: '#202224',
              dark: '#FFFFFF',
            }
          }
        },
        dashboard: {
          bg: {
            light: '#f5f6fa',
            dark: '#16181D',
          },
          card: {
            bg: {
              light: '#FFFFFF',
              dark: '#2C3138',
            },
            bg2: {
              light: '#F3F3F3',
              dark: '#353B44',
            },
            text: {
              primary: {
                light: '#202224',
                dark: '#FFFFFF',
              },
              secondary: {
                light: 'rgba(62, 62, 62, 0.8)',
                dark: '#A7B0BA',
              }
            },
            tab: {
              inactive: {
                light: 'rgba(62, 62, 62, 0.15)',
                dark: 'rgba(255, 255, 255, 0.1)',
              },
              active: {
                light: '#0C79F7',
                dark: '#3B94F8',
              },
              box: {
                light: '#FBFCFF',
                dark: '#353B44',
              },
              text: {
                inactive: {
                  light: 'rgba(62, 62, 62, 0.8)',
                  dark: '#A7B0BA',
                },
                active: {
                  light: '#FFFFFF',
                  dark: '#FFFFFF',
                }
              }
            }
          },
          box: {
            bg: {
              default: {
                light: '#FFFFFF',
                dark: '#353B44',
              },
              hover: {
                light: 'rgba(72, 128, 255, 1)',
                dark: '#0C79F7',
              }
            },
            text: {
              default: {
                light: '#171821',
                dark: '#FFFFFF',
              },
              hover: {
                light: '#FFFFFF',
                dark: '#FFFFFF',
              }
            },
            border: {
              light: 'rgba(151, 151, 151, 0.6)',
              dark: 'rgba(255, 255, 255, 0.08)',
            }
          }
        }
      },
    },
  },
  darkMode: 'class', // Enable dark mode with class strategy
  plugins: [],
}
