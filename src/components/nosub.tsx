import {useNavigate } from 'react-router-dom';

export default function NoSub(){
	const nav = useNavigate();
	return(
		<div>
			<p> Thanks for using Alexandria, unfortuntely you've used up all your free instances</p>
				<button onClick={() => navigate('/pricing')}>
					Please Subscribe Today!
				</button>
			</div>
		);
	)
}
