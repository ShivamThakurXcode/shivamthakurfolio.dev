import {Composition} from 'remotion';
import {EventLoop} from './EventLoop';

export const Root = () => (
  <Composition id="EventLoop" component={EventLoop} width={1080} height={1920} fps={30} durationInFrames={1800} />
);
