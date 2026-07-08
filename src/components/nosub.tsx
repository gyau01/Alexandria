"use client"
import {useRouter } from 'next/navigation';

export default function NoSub(){
	const nav = useRouter();
	return(
		<div>
			<p> Thanks for using Alexandria, unfortuntely you've used up all your free instances</p>
				<button onClick={() => nav.push('/pricing')}>
					Please Subscribe Today!
				</button>
		</div>
		);
}
